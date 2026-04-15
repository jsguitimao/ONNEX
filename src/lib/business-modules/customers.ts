import type { Prisma } from "@prisma/client";
import { sanitizeBookingCustomerInput } from "@/lib/customer-identity";
import { db } from "@/lib/db";

type PrismaClientLike = typeof db | Prisma.TransactionClient;
import { getCurrentBusiness } from "./core";
import type { CustomerSnapshot } from "./types";

export async function getCustomersSnapshot(): Promise<CustomerSnapshot> {
  const business = await getCurrentBusiness();

  const customers = await db.customer.findMany({
    where: { businessId: business.id },
    orderBy: [{ lastBookedAt: "desc" }, { createdAt: "desc" }],
  });

  const customerIds = customers.map((customer) => customer.id);
  const bookings =
    customerIds.length > 0
      ? await db.booking.findMany({
          where: {
            businessId: business.id,
            customerId: {
              in: customerIds,
            },
          },
          select: {
            customerId: true,
            status: true,
            priceCents: true,
            service: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { startsAt: "desc" },
        })
      : [];

  type CustomerBookingStats = {
    totalBookings: number;
    totalSpentCents: number;
    lastServiceName: string | null;
  };

  const statsByCustomer = new Map<string, CustomerBookingStats>();

  for (const booking of bookings) {
    if (!booking.customerId) continue;

    const current = statsByCustomer.get(booking.customerId) ?? {
      totalBookings: 0,
      totalSpentCents: 0,
      lastServiceName: null,
    };

    current.totalBookings += 1;

    if (!["CANCELLED", "NO_SHOW"].includes(booking.status)) {
      current.totalSpentCents += booking.priceCents;
    }

    if (!current.lastServiceName) {
      current.lastServiceName = booking.service.name;
    }

    statsByCustomer.set(booking.customerId, current);
  }

  return {
    customers: customers.map((customer) => ({
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      notes: customer.notes,
      marketingOptIn: customer.marketingOptIn,
      lastBookedAt: customer.lastBookedAt,
      totalBookings: statsByCustomer.get(customer.id)?.totalBookings ?? 0,
      totalSpentCents: statsByCustomer.get(customer.id)?.totalSpentCents ?? 0,
      lastServiceName: statsByCustomer.get(customer.id)?.lastServiceName ?? null,
    })),
  };
}

export async function updateCustomer(
  id: string,
  input: {
    fullName: string;
    email?: string;
    phone?: string;
    notes?: string;
    marketingOptIn: boolean;
  }
) {
  const business = await getCurrentBusiness();
  const customer = await db.customer.findFirst({
    where: { id, businessId: business.id },
  });

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  const sanitized = sanitizeBookingCustomerInput({
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
  });

  return db.customer.update({
    where: { id },
    data: {
      fullName: sanitized.fullName,
      email: sanitized.email,
      phone: sanitized.phone,
      notes: input.notes || null,
      marketingOptIn: input.marketingOptIn,
    },
  });
}

async function findCustomerByNormalizedPhone(
  businessId: string,
  phone: string,
  client: PrismaClientLike = db
) {
  const candidates = await client.customer.findMany({
    where: {
      businessId,
      phone: { not: null },
    },
    orderBy: [{ lastBookedAt: "desc" }, { createdAt: "desc" }],
  });

  return (
    candidates.find(
      (candidate) =>
        sanitizeBookingCustomerInput({
          fullName: candidate.fullName,
          email: candidate.email,
          phone: candidate.phone,
        }).phone === phone
    ) ?? null
  );
}

export async function upsertBookingCustomer(
  input: {
    businessId: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    lastBookedAt: Date;
  },
  client: PrismaClientLike = db
) {
  const sanitized = sanitizeBookingCustomerInput({
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
  });

  let existingCustomer = null;

  if (sanitized.email) {
    existingCustomer = await client.customer.findFirst({
      where: {
        businessId: input.businessId,
        email: {
          equals: sanitized.email,
          mode: "insensitive",
        },
      },
      orderBy: [{ lastBookedAt: "desc" }, { createdAt: "desc" }],
    });
  }

  if (!existingCustomer && sanitized.phone) {
    existingCustomer = await findCustomerByNormalizedPhone(input.businessId, sanitized.phone, client);
  }

  if (!existingCustomer) {
    return client.customer.create({
      data: {
        businessId: input.businessId,
        fullName: sanitized.fullName,
        email: sanitized.email,
        phone: sanitized.phone,
        lastBookedAt: input.lastBookedAt,
      },
    });
  }

  const nextLastBookedAt =
    existingCustomer.lastBookedAt && existingCustomer.lastBookedAt > input.lastBookedAt
      ? existingCustomer.lastBookedAt
      : input.lastBookedAt;

  return client.customer.update({
    where: { id: existingCustomer.id },
    data: {
      fullName: sanitized.fullName,
      email: sanitized.email ?? existingCustomer.email,
      phone: sanitized.phone ?? existingCustomer.phone,
      lastBookedAt: nextLastBookedAt,
    },
  });
}
