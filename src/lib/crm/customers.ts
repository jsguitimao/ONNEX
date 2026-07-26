import { db } from "@/lib/db";
import {
  normalizeCustomerEmail,
  normalizeCustomerName,
  normalizeCustomerPhone,
} from "@/lib/customer-identity";
import type { CreateCustomerInput } from "./schema";

export type CrmCustomerRow = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  lastBookedAt: Date | null;
  createdAt: Date;
  bookingCount: number;
  // Barbeiros (StaffMember) associados ao cliente: união das marcações com o
  // profissional atribuído à mão. Vazio = cliente sem barbeiro ("Sem profissional").
  staffMemberIds: string[];
  // Profissional atribuído à mão à ficha (independente das marcações). null = nenhum.
  assignedStaffMemberId: string | null;
};

export type CrmCustomerKpis = {
  total: number;
  recurringPercent: number;
  withoutVisit: number;
};

export type CrmCustomerErrorCode =
  | "DUPLICATE_EMAIL"
  | "DUPLICATE_PHONE"
  | "CUSTOMER_NOT_FOUND";

export class CrmCustomerError extends Error {
  constructor(public code: CrmCustomerErrorCode, message: string) {
    super(message);
  }
}

const RECURRING_BOOKINGS_THRESHOLD = 2;
const WITHOUT_VISIT_DAYS = 60;
const WITHOUT_VISIT_MS = WITHOUT_VISIT_DAYS * 24 * 60 * 60 * 1000;

export async function listCustomers(
  businessId: string,
  options: { limit?: number } = {},
): Promise<CrmCustomerRow[]> {
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);

  const customers = await db.customer.findMany({
    where: { businessId },
    orderBy: [{ lastBookedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      _count: { select: { bookings: true } },
    },
  });

  const staffLinks = await getCustomerStaffLinks(
    businessId,
    customers.map((customer) => customer.id),
  );

  return customers.map((customer) => ({
    id: customer.id,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    notes: customer.notes,
    lastBookedAt: customer.lastBookedAt,
    createdAt: customer.createdAt,
    bookingCount: customer._count.bookings,
    staffMemberIds: mergeStaffIds(staffLinks.get(customer.id), customer.assignedStaffMemberId),
    assignedStaffMemberId: customer.assignedStaffMemberId,
  }));
}

/**
 * Barbeiros de um cliente = união dos das marcações com o profissional atribuído
 * à mão (se houver). Sem duplicados.
 */
function mergeStaffIds(fromBookings: string[] | undefined, assigned: string | null): string[] {
  const set = new Set(fromBookings ?? []);
  if (assigned) set.add(assigned);
  return [...set];
}

/**
 * Barbeiros com quem cada cliente já marcou. Ligação cliente→barbeiro derivada
 * das marcações (os clientes não têm barbeiro fixo no schema).
 */
async function getCustomerStaffLinks(
  businessId: string,
  customerIds: string[],
): Promise<Map<string, string[]>> {
  if (customerIds.length === 0) return new Map();

  const grouped = await db.booking.groupBy({
    by: ["customerId", "staffMemberId"],
    where: {
      businessId,
      customerId: { in: customerIds },
      staffMemberId: { not: null },
    },
  });

  const sets = new Map<string, Set<string>>();
  for (const row of grouped) {
    if (!row.customerId || !row.staffMemberId) continue;
    const set = sets.get(row.customerId) ?? new Set<string>();
    set.add(row.staffMemberId);
    sets.set(row.customerId, set);
  }

  const result = new Map<string, string[]>();
  for (const [customerId, set] of sets) {
    result.set(customerId, [...set]);
  }
  return result;
}

export async function computeCustomerKpis(businessId: string): Promise<CrmCustomerKpis> {
  const cutoff = new Date(Date.now() - WITHOUT_VISIT_MS);

  const [total, withoutVisit, recurringCount] = await Promise.all([
    db.customer.count({ where: { businessId } }),
    db.customer.count({
      where: {
        businessId,
        OR: [{ lastBookedAt: null }, { lastBookedAt: { lt: cutoff } }],
      },
    }),
    countRecurringCustomers(businessId),
  ]);

  const recurringPercent = total === 0 ? 0 : Math.round((recurringCount / total) * 100);

  return {
    total,
    recurringPercent,
    withoutVisit,
  };
}

async function countRecurringCustomers(businessId: string) {
  const grouped = await db.booking.groupBy({
    by: ["customerId"],
    where: {
      businessId,
      customerId: { not: null },
    },
    _count: { _all: true },
  });

  return grouped.filter((row) => row._count._all >= RECURRING_BOOKINGS_THRESHOLD).length;
}

/**
 * Valida o profissional atribuído: só aceita um barbeiro ativo do próprio negócio.
 * "" / inválido → null (sem profissional). Evita atribuir a um id de outra
 * barbearia ou inexistente.
 */
async function resolveAssignedStaffId(
  businessId: string,
  raw: string | null | undefined,
): Promise<string | null> {
  const id = typeof raw === "string" ? raw.trim() : "";
  if (!id) return null;
  const staff = await db.staffMember.findFirst({
    where: { id, businessId, isActive: true, deletedAt: null },
    select: { id: true },
  });
  return staff?.id ?? null;
}

export async function createCustomer(
  businessId: string,
  input: CreateCustomerInput,
): Promise<CrmCustomerRow> {
  const fullName = normalizeCustomerName(input.fullName);
  const email = normalizeCustomerEmail(input.email);
  const phone = normalizeCustomerPhone(input.phone);
  const notes = input.notes.trim() || null;

  if (email) {
    const conflict = await db.customer.findFirst({
      where: {
        businessId,
        email: { equals: email, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (conflict) {
      throw new CrmCustomerError("DUPLICATE_EMAIL", "Já existe um cliente com este email.");
    }
  }

  if (phone) {
    const conflict = await db.customer.findFirst({
      where: { businessId, phone },
      select: { id: true },
    });
    if (conflict) {
      throw new CrmCustomerError("DUPLICATE_PHONE", "Já existe um cliente com este telefone.");
    }
  }

  const assignedStaffMemberId = await resolveAssignedStaffId(businessId, input.assignedStaffMemberId);

  const created = await db.customer.create({
    data: {
      businessId,
      fullName,
      email,
      phone,
      notes,
      assignedStaffMemberId,
    },
    include: { _count: { select: { bookings: true } } },
  });

  return {
    id: created.id,
    fullName: created.fullName,
    email: created.email,
    phone: created.phone,
    notes: created.notes,
    lastBookedAt: created.lastBookedAt,
    createdAt: created.createdAt,
    bookingCount: created._count.bookings,
    // Sem marcações ainda: a lista dele vem do profissional atribuído (se houver).
    staffMemberIds: assignedStaffMemberId ? [assignedStaffMemberId] : [],
    assignedStaffMemberId,
  };
}

export async function updateCustomer(
  businessId: string,
  customerId: string,
  input: CreateCustomerInput,
): Promise<CrmCustomerRow> {
  const existing = await db.customer.findFirst({
    where: { id: customerId, businessId },
    select: { id: true },
  });
  if (!existing) {
    throw new CrmCustomerError("CUSTOMER_NOT_FOUND" as CrmCustomerErrorCode, "Cliente não encontrado.");
  }

  const fullName = normalizeCustomerName(input.fullName);
  const email = normalizeCustomerEmail(input.email);
  const phone = normalizeCustomerPhone(input.phone);
  const notes = input.notes.trim() || null;

  if (email) {
    const conflict = await db.customer.findFirst({
      where: {
        businessId,
        email: { equals: email, mode: "insensitive" },
        NOT: { id: existing.id },
      },
      select: { id: true },
    });
    if (conflict) {
      throw new CrmCustomerError("DUPLICATE_EMAIL", "Já existe um cliente com este email.");
    }
  }

  if (phone) {
    const conflict = await db.customer.findFirst({
      where: { businessId, phone, NOT: { id: existing.id } },
      select: { id: true },
    });
    if (conflict) {
      throw new CrmCustomerError("DUPLICATE_PHONE", "Já existe um cliente com este telefone.");
    }
  }

  const assignedStaffMemberId = await resolveAssignedStaffId(businessId, input.assignedStaffMemberId);

  const updated = await db.customer.update({
    where: { id: existing.id },
    data: { fullName, email, phone, notes, assignedStaffMemberId },
    include: { _count: { select: { bookings: true } } },
  });

  // A edição não mexe nas marcações; juntamos o profissional atribuído aos
  // barbeiros das marcações para a linha aparecer na secção certa.
  const staffLinks = await getCustomerStaffLinks(businessId, [updated.id]);

  return {
    id: updated.id,
    fullName: updated.fullName,
    email: updated.email,
    phone: updated.phone,
    notes: updated.notes,
    lastBookedAt: updated.lastBookedAt,
    createdAt: updated.createdAt,
    bookingCount: updated._count.bookings,
    staffMemberIds: mergeStaffIds(staffLinks.get(updated.id), assignedStaffMemberId),
    assignedStaffMemberId,
  };
}

export async function deleteCustomer(businessId: string, customerId: string): Promise<void> {
  const existing = await db.customer.findFirst({
    where: { id: customerId, businessId },
    select: { id: true },
  });

  if (!existing) {
    throw new CrmCustomerError("CUSTOMER_NOT_FOUND", "Cliente não encontrado.");
  }

  // O schema usa onDelete: SetNull em Booking.customerId — as marcações
  // existentes mantêm-se com o customerName preservado, apenas perdem a
  // ligação ao registo do cliente.
  await db.customer.delete({ where: { id: existing.id } });
}

export function toCrmCustomerRowDto(row: CrmCustomerRow) {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    lastBookedAt: row.lastBookedAt ? row.lastBookedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    bookingCount: row.bookingCount,
    staffMemberIds: row.staffMemberIds,
    assignedStaffMemberId: row.assignedStaffMemberId,
  };
}

export type CrmCustomerRowDto = ReturnType<typeof toCrmCustomerRowDto>;
