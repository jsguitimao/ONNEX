import { db } from "@/lib/db";
import {
  getSafeTimeZone,
  getWeekDateKeys,
  getZonedDateKey,
  getZonedDayBounds,
} from "@/lib/timezone";

export type CrmBookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type CrmBookingRow = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: CrmBookingStatus;
  source: "ONLINE" | "MANUAL" | "IMPORTED";
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  serviceName: string;
  staffMemberId: string | null;
  staffMemberName: string | null;
};

export type CrmBookingRowDto = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: CrmBookingStatus;
  source: "ONLINE" | "MANUAL" | "IMPORTED";
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  serviceName: string;
  staffMemberId: string | null;
  staffMemberName: string | null;
};

export type CrmPendingBooking = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  serviceName: string;
  staffMemberId: string | null;
  staffMemberName: string | null;
  source: "ONLINE" | "MANUAL" | "IMPORTED";
};

export type CrmPendingBookingDto = {
  id: string;
  startsAt: string;
  endsAt: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  serviceName: string;
  staffMemberId: string | null;
  staffMemberName: string | null;
  source: "ONLINE" | "MANUAL" | "IMPORTED";
};

export type CrmBookingErrorCode =
  | "BOOKING_NOT_FOUND"
  | "BOOKING_NOT_PENDING"
  | "BOOKING_NOT_CONFIRMED";

export class CrmBookingError extends Error {
  constructor(public code: CrmBookingErrorCode, message: string) {
    super(message);
  }
}

export async function listPendingBookings(
  businessId: string,
  options: { limit?: number } = {},
): Promise<CrmPendingBooking[]> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);

  const bookings = await db.booking.findMany({
    where: { businessId, status: "PENDING" },
    orderBy: { startsAt: "asc" },
    take: limit,
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      source: true,
      staffMemberId: true,
      staffMember: { select: { fullName: true } },
      service: { select: { name: true } },
    },
  });

  return bookings.map((booking) => ({
    id: booking.id,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    serviceName: booking.service.name,
    staffMemberId: booking.staffMemberId,
    staffMemberName: booking.staffMember?.fullName ?? null,
    source: booking.source,
  }));
}

export async function acceptPendingBooking(
  businessId: string,
  bookingId: string,
): Promise<void> {
  const exists = await db.booking.findFirst({
    where: { id: bookingId, businessId },
    select: { id: true },
  });
  if (!exists) {
    throw new CrmBookingError("BOOKING_NOT_FOUND", "Reserva não encontrada.");
  }

  const result = await db.booking.updateMany({
    where: { id: bookingId, businessId, status: "PENDING" },
    data: { status: "CONFIRMED" },
  });

  if (result.count === 0) {
    throw new CrmBookingError(
      "BOOKING_NOT_PENDING",
      "Esta reserva já foi atualizada por outra via.",
    );
  }
}

export async function rejectPendingBooking(
  businessId: string,
  bookingId: string,
): Promise<void> {
  const exists = await db.booking.findFirst({
    where: { id: bookingId, businessId },
    select: { id: true },
  });
  if (!exists) {
    throw new CrmBookingError("BOOKING_NOT_FOUND", "Reserva não encontrada.");
  }

  const result = await db.booking.updateMany({
    where: { id: bookingId, businessId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  if (result.count === 0) {
    throw new CrmBookingError(
      "BOOKING_NOT_PENDING",
      "Esta reserva já foi atualizada por outra via.",
    );
  }
}

async function transitionConfirmedBooking(
  businessId: string,
  bookingId: string,
  nextStatus: "COMPLETED" | "CANCELLED" | "NO_SHOW",
): Promise<void> {
  const exists = await db.booking.findFirst({
    where: { id: bookingId, businessId },
    select: { id: true },
  });
  if (!exists) {
    throw new CrmBookingError("BOOKING_NOT_FOUND", "Reserva não encontrada.");
  }

  const result = await db.booking.updateMany({
    where: { id: bookingId, businessId, status: "CONFIRMED" },
    data: { status: nextStatus },
  });

  if (result.count === 0) {
    throw new CrmBookingError(
      "BOOKING_NOT_CONFIRMED",
      "Só é possível atualizar reservas que estejam Confirmadas.",
    );
  }
}

export async function completeConfirmedBooking(
  businessId: string,
  bookingId: string,
): Promise<void> {
  return transitionConfirmedBooking(businessId, bookingId, "COMPLETED");
}

export async function cancelConfirmedBooking(
  businessId: string,
  bookingId: string,
): Promise<void> {
  return transitionConfirmedBooking(businessId, bookingId, "CANCELLED");
}

export async function markBookingNoShow(
  businessId: string,
  bookingId: string,
): Promise<void> {
  return transitionConfirmedBooking(businessId, bookingId, "NO_SHOW");
}

type BookingDateRange = { start: Date; endExclusive: Date };

const bookingSelect = {
  id: true,
  startsAt: true,
  endsAt: true,
  status: true,
  source: true,
  customerName: true,
  customerPhone: true,
  customerEmail: true,
  staffMemberId: true,
  staffMember: { select: { fullName: true } },
  service: { select: { name: true } },
} as const;

function getZonedTodayBounds(timezone: string | null | undefined): BookingDateRange | null {
  const tz = getSafeTimeZone(timezone);
  const today = getZonedDateKey(new Date(), tz);
  return getZonedDayBounds(today, tz);
}

function getZonedCurrentWeekBounds(
  timezone: string | null | undefined,
): BookingDateRange | null {
  const tz = getSafeTimeZone(timezone);
  const today = getZonedDateKey(new Date(), tz);
  const keys = getWeekDateKeys(today, 1);
  if (keys.length !== 7) return null;
  const startBounds = getZonedDayBounds(keys[0], tz);
  const endBounds = getZonedDayBounds(keys[6], tz);
  if (!startBounds || !endBounds) return null;
  return { start: startBounds.start, endExclusive: endBounds.endExclusive };
}

type RawBookingRow = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: CrmBookingStatus;
  source: "ONLINE" | "MANUAL" | "IMPORTED";
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  staffMemberId: string | null;
  staffMember: { fullName: string } | null;
  service: { name: string };
};

function mapBookingRow(row: RawBookingRow): CrmBookingRow {
  return {
    id: row.id,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
    source: row.source,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    serviceName: row.service.name,
    staffMemberId: row.staffMemberId,
    staffMemberName: row.staffMember?.fullName ?? null,
  };
}

export async function listWeeklyBookings(
  businessId: string,
  options: { timezone?: string | null } = {},
): Promise<CrmBookingRow[]> {
  const range = getZonedCurrentWeekBounds(options.timezone);
  if (!range) return [];

  const bookings = await db.booking.findMany({
    where: {
      businessId,
      startsAt: { gte: range.start, lt: range.endExclusive },
    },
    orderBy: { startsAt: "asc" },
    take: 500,
    select: bookingSelect,
  });

  return bookings.map(mapBookingRow);
}

export async function listDailyBookings(
  businessId: string,
  options: { timezone?: string | null } = {},
): Promise<CrmBookingRow[]> {
  const range = getZonedTodayBounds(options.timezone);
  if (!range) return [];

  const bookings = await db.booking.findMany({
    where: {
      businessId,
      startsAt: { gte: range.start, lt: range.endExclusive },
    },
    orderBy: { startsAt: "asc" },
    take: 200,
    select: bookingSelect,
  });

  return bookings.map(mapBookingRow);
}

export function toCrmBookingRowDto(row: CrmBookingRow): CrmBookingRowDto {
  return {
    id: row.id,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status: row.status,
    source: row.source,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    serviceName: row.serviceName,
    staffMemberId: row.staffMemberId,
    staffMemberName: row.staffMemberName,
  };
}

export function toCrmPendingBookingDto(row: CrmPendingBooking): CrmPendingBookingDto {
  return {
    id: row.id,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    serviceName: row.serviceName,
    staffMemberId: row.staffMemberId,
    staffMemberName: row.staffMemberName,
    source: row.source,
  };
}
