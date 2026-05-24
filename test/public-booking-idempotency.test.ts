import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory fake Prisma store. `booking.findUnique` deliberately understands
// BOTH lookup shapes:
//   - { where: { idempotencyKey } }                 -> global (vulneravel)
//   - { where: { businessId_idempotencyKey: {...} }}-> scoped (corrigido)
// Assim o mesmo teste falha com o codigo antigo (lookup global devolvia a
// reserva de outro negocio) e passa com o codigo corrigido (lookup scoped).
const h = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const bookings: Row[] = [];
  const services: Row[] = [];
  const staff: Row[] = [];
  let counter = 0;

  function withIncludes(row: Row, include?: { service?: boolean; staffMember?: boolean }) {
    const out: Row = { ...row };
    if (include?.service) out.service = services.find((s) => s.id === row.serviceId) ?? null;
    if (include?.staffMember) out.staffMember = staff.find((s) => s.id === row.staffMemberId) ?? null;
    return out;
  }

  function matchBooking(where: Record<string, unknown>): Row | undefined {
    if (typeof where.id === "string") return bookings.find((b) => b.id === where.id);
    if (typeof where.publicToken === "string") return bookings.find((b) => b.publicToken === where.publicToken);
    if (typeof where.idempotencyKey === "string") {
      return bookings.find((b) => b.idempotencyKey === where.idempotencyKey);
    }
    if (where.businessId_idempotencyKey) {
      const key = where.businessId_idempotencyKey as { businessId: string; idempotencyKey: string };
      return bookings.find(
        (b) => b.businessId === key.businessId && b.idempotencyKey === key.idempotencyKey
      );
    }
    return undefined;
  }

  const db = {
    booking: {
      findUnique: vi.fn(async ({ where, include }: { where: Record<string, unknown>; include?: { service?: boolean; staffMember?: boolean } }) => {
        const row = matchBooking(where);
        return row ? withIncludes(row, include) : null;
      }),
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      create: vi.fn(async ({ data, include }: { data: Row; include?: { service?: boolean; staffMember?: boolean } }) => {
        counter += 1;
        const row: Row = { id: `bk-new-${counter}`, ...data };
        bookings.push(row);
        return withIncludes(row, include);
      }),
    },
    scheduleBlock: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => null) },
    service: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; businessId: string } }) =>
        services.find((s) => s.id === where.id && s.businessId === where.businessId) ?? null
      ),
    },
    staffMember: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; businessId: string } }) =>
        staff.find((s) => s.id === where.id && s.businessId === where.businessId) ?? null
      ),
    },
  };

  return {
    bookings,
    services,
    staff,
    db,
    reset() {
      bookings.length = 0;
      services.length = 0;
      staff.length = 0;
      counter = 0;
    },
  };
});

vi.mock("@/lib/db", () => ({ db: h.db }));
vi.mock("@/lib/business-modules/core", () => ({ getBusinessBySlug: vi.fn() }));
vi.mock("@/lib/business-modules/customers", () => ({
  upsertBookingCustomer: vi.fn(async () => ({ id: "cust-1" })),
}));
vi.mock("@/lib/notifications", () => ({
  sendBookingNotification: vi.fn(async () => {}),
  sendStaffBookingNotification: vi.fn(async () => {}),
  sendRepresentativeBookingNotification: vi.fn(async () => {}),
}));
vi.mock("@/lib/booking-transaction", () => ({
  runBookingTransaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(h.db)),
  assertSlotAvailable: vi.fn(async () => {}),
}));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn() }));

import { createPublicBooking } from "@/lib/business-modules/public";
import { getBusinessBySlug } from "@/lib/business-modules/core";

const allDayAvailability = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  startTime: "00:00",
  endTime: "23:00",
  isActive: true,
}));

function makeBusiness(id: string, slug: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    slug,
    name: slug,
    onlineBooking: true,
    bookingLeadTimeHours: 1,
    bookingWindowDays: 365,
    slotIntervalMinutes: 60,
    cancellationWindowHours: 2,
    timezone: "UTC",
    autoAcceptBookings: false,
    locations: [{ id: `loc-${id}` }],
    ...overrides,
  };
}

// Hora certa, em UTC, 7 dias no futuro -> garante que cai na disponibilidade
// (00:00-23:00 todos os dias) e bate exatamente num slot de 60 em 60 min.
function futureWholeHourUtcIso() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  d.setUTCHours(10, 0, 0, 0);
  return d.toISOString();
}

const SHARED_KEY = "shared-idempotency-key";
const businessA = makeBusiness("biz-a", "salon-a");
const businessB = makeBusiness("biz-b", "salon-b");

beforeEach(() => {
  h.reset();
  vi.clearAllMocks();

  h.services.push(
    { id: "svc-a", businessId: "biz-a", name: "Corte A", durationMinutes: 30, priceCents: 1000, isActive: true, deletedAt: null },
    { id: "svc-b", businessId: "biz-b", name: "Corte B", durationMinutes: 30, priceCents: 1500, isActive: true, deletedAt: null }
  );
  h.staff.push(
    { id: "stf-a", businessId: "biz-a", fullName: "Ana", autoAcceptBookings: false, isActive: true, deletedAt: null, services: [{ serviceId: "svc-a" }], availabilities: allDayAvailability },
    { id: "stf-b", businessId: "biz-b", fullName: "Bruno", autoAcceptBookings: false, isActive: true, deletedAt: null, services: [{ serviceId: "svc-b" }], availabilities: allDayAvailability }
  );

  // Reserva ja existente no negocio A, com a chave partilhada e o seu publicToken.
  h.bookings.push({
    id: "bk-A",
    businessId: "biz-a",
    idempotencyKey: SHARED_KEY,
    publicToken: "tok-A",
    serviceId: "svc-a",
    staffMemberId: "stf-a",
    status: "CONFIRMED",
    startsAt: new Date(),
    endsAt: new Date(),
  });

  vi.mocked(getBusinessBySlug).mockImplementation(async (slug: string) => {
    if (slug === "salon-a") return businessA as never;
    if (slug === "salon-b") return businessB as never;
    return null;
  });
});

describe("createPublicBooking idempotency é scoped ao negócio (CVE cross-tenant takeover)", () => {
  it("NÃO devolve a reserva de outro negócio quando a idempotencyKey colide", async () => {
    // Negocio B usa a MESMA chave que ja existe no negocio A. O lookup tem de
    // ser scoped a B (devolve null) e seguir o fluxo normal — nunca devolver
    // a reserva de A. Aqui forcamos um erro proprio de B (serviceId inexistente
    // em B) para provar que NAO houve short-circuit com a reserva alheia.
    await expect(
      createPublicBooking({
        slug: "salon-b",
        serviceId: "svc-a", // pertence a A, nao existe em B
        staffMemberId: "stf-a",
        startsAt: futureWholeHourUtcIso(),
        customerName: "Cliente B",
        customerEmail: "cliente.b@example.com",
        idempotencyKey: SHARED_KEY,
      })
    ).rejects.toThrow("DADOS_INVALIDOS");

    // A reserva de A ficou intacta e nada foi criado em B.
    expect(h.bookings).toHaveLength(1);
    expect(h.bookings[0].id).toBe("bk-A");
  });

  it("mantém a idempotência DENTRO do mesmo negócio (retry devolve a mesma reserva)", async () => {
    const result = await createPublicBooking({
      slug: "salon-a",
      serviceId: "svc-a",
      staffMemberId: "stf-a",
      startsAt: futureWholeHourUtcIso(),
      customerName: "Ana",
      customerEmail: "ana@example.com",
      idempotencyKey: SHARED_KEY,
    });

    expect(result.id).toBe("bk-A");
    expect(result.publicToken).toBe("tok-A");
    // Retry idempotente: nao cria segunda reserva.
    expect(h.bookings).toHaveLength(1);
  });

  it("permite a MESMA idempotencyKey em negócios diferentes como reservas independentes", async () => {
    const created = await createPublicBooking({
      slug: "salon-b",
      serviceId: "svc-b",
      staffMemberId: "stf-b",
      startsAt: futureWholeHourUtcIso(),
      customerName: "Bruno",
      customerEmail: "bruno@example.com",
      idempotencyKey: SHARED_KEY,
    });

    // Reserva nova, do negocio B, com token proprio — sem vazar nada de A.
    expect(created.businessId).toBe("biz-b");
    expect(created.idempotencyKey).toBe(SHARED_KEY);
    expect(created.id).not.toBe("bk-A");
    expect(created.publicToken).not.toBe("tok-A");

    // As duas reservas coexistem com a mesma chave em negocios diferentes.
    const shared = h.bookings.filter((b) => b.idempotencyKey === SHARED_KEY);
    expect(shared).toHaveLength(2);
    expect(new Set(shared.map((b) => b.businessId))).toEqual(new Set(["biz-a", "biz-b"]));
  });
});
