import { set } from "date-fns";
import { getCronSecret, getEmailFrom } from "@/lib/app-config";
import { assertSlotAvailable, runBookingTransaction } from "@/lib/booking-transaction";
import { sanitizeBookingCustomerInput } from "@/lib/customer-identity";
import { db } from "@/lib/db";
import {
  retryNotificationDelivery,
  sendBookingNotification,
  sendRepresentativeBookingNotification,
} from "@/lib/notifications";
import {
  addDaysToDateKey,
  getDayOfWeekForDateKey,
  getSafeTimeZone,
  getWeekDateKeys,
  getZonedDateKey,
  getZonedDayBounds,
  getZonedTimeValue,
} from "@/lib/timezone";
import { getCurrentBusiness } from "./core";
import { upsertBookingCustomer } from "./customers";
import type {
  BookingAgendaItem,
  BookingAgendaSnapshot,
  BookingAgendaViewSnapshot,
  BookingAgendaWeekSnapshot,
  CommunicationSnapshot,
} from "./types";

function maskNotificationRecipient(channel: "EMAIL" | "SMS", recipient: string) {
  if (!recipient) {
    return "Sem destinatário";
  }

  if (channel === "EMAIL") {
    const [localPart, domain] = recipient.split("@");
    if (!localPart || !domain) {
      return recipient;
    }

    const visibleStart = localPart.slice(0, 2);
    return `${visibleStart}${"*".repeat(Math.max(localPart.length - visibleStart.length, 2))}@${domain}`;
  }

  const normalized = recipient.replace(/\s+/g, "");
  if (normalized.length <= 6) {
    return normalized;
  }

  return `${normalized.slice(0, 4)}${"*".repeat(Math.max(normalized.length - 6, 3))}${normalized.slice(-2)}`;
}

function mapBookingAgendaItem(booking: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  source: "ONLINE" | "MANUAL" | "IMPORTED";
  serviceId: string;
  staffMemberId: string | null;
  priceCents: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  internalNotes: string | null;
  service: { name: string };
  staffMember: { fullName: string } | null;
}): BookingAgendaItem {
  return {
    id: booking.id,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    status: booking.status,
    source: booking.source,
    serviceId: booking.serviceId,
    staffMemberId: booking.staffMemberId,
    priceCents: booking.priceCents,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    internalNotes: booking.internalNotes,
    serviceName: booking.service.name,
    staffName: booking.staffMember?.fullName ?? "Sem profissional",
  };
}

export async function getDashboardSnapshot() {
  const business = await getCurrentBusiness();

  const timeZone = getSafeTimeZone(business.timezone);
  const currentMonthKey = `${getZonedDateKey(new Date(), timeZone).slice(0, 7)}-01`;
  const nextMonthKey = addDaysToDateKey(currentMonthKey, 32)?.slice(0, 7).concat("-01") ?? currentMonthKey;
  const monthStart = getZonedDayBounds(currentMonthKey, timeZone)?.start ?? set(new Date(), { date: 1, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
  const nextMonthStart = getZonedDayBounds(nextMonthKey, timeZone)?.start;
  const monthFilter = nextMonthStart
    ? { startsAt: { gte: monthStart, lt: nextMonthStart } }
    : { startsAt: { gte: monthStart } };
  const [monthlyRevenue, bookingsCount, recentBookings] = await Promise.all([
    db.booking.aggregate({
      where: {
        businessId: business.id,
        ...monthFilter,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      _sum: {
        priceCents: true,
      },
    }),
    db.booking.count({
      where: {
        businessId: business.id,
        ...monthFilter,
      },
    }),
    db.booking.findMany({
      where: {
        businessId: business.id,
      },
      include: {
        service: true,
        staffMember: true,
      },
      orderBy: { startsAt: "desc" },
      take: 6,
    }),
  ]);

  return {
    businessName: business.name,
    slug: business.slug,
    servicesCount: business.services.length,
    staffCount: business.staffMembers.length,
    monthlyRevenueCents: monthlyRevenue._sum.priceCents ?? 0,
    city: business.locations[0]?.city ?? "Lisboa",
    bookingsCount,
    recentBookings: recentBookings.map((booking) => ({
      id: booking.id,
      customerName: booking.customerName,
      startsAt: booking.startsAt,
      status: booking.status,
      serviceName: booking.service.name,
      staffName: booking.staffMember?.fullName ?? "Sem profissional",
    })),
  };
}

export async function getCommunicationSnapshot(): Promise<CommunicationSnapshot> {
  const business = await getCurrentBusiness();
  const since = new Date(Date.now() - 24 * 60 * 60_000);

  const [sentLast24h, failedLast24h, skippedLast24h, notifications, reminderRuns] = await Promise.all([
    db.notificationLog.count({
      where: {
        businessId: business.id,
        createdAt: { gte: since },
        status: "SENT",
      },
    }),
    db.notificationLog.count({
      where: {
        businessId: business.id,
        createdAt: { gte: since },
        status: "FAILED",
      },
    }),
    db.notificationLog.count({
      where: {
        businessId: business.id,
        createdAt: { gte: since },
        status: "SKIPPED",
      },
    }),
    db.notificationLog.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        booking: {
          include: {
            service: true,
          },
        },
      },
    }),
    db.reminderRunLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  return {
    channels: {
      emailConfigured: Boolean(process.env.RESEND_API_KEY?.trim() && getEmailFrom()),
      smsConfigured: Boolean(
        process.env.TWILIO_ACCOUNT_SID?.trim() &&
          process.env.TWILIO_AUTH_TOKEN?.trim() &&
          process.env.TWILIO_PHONE_NUMBER?.trim()
      ),
      cronSecretConfigured: Boolean(getCronSecret()),
    },
    totals: {
      sentLast24h,
      failedLast24h,
      skippedLast24h,
    },
    reminderEngine: {
      latestRun: reminderRuns[0]
        ? {
            id: reminderRuns[0].id,
            source: reminderRuns[0].source,
            status: reminderRuns[0].status,
            createdAt: reminderRuns[0].createdAt,
            scanned: reminderRuns[0].scanned,
            sent: reminderRuns[0].sent,
            skipped: reminderRuns[0].skipped,
            failed: reminderRuns[0].failed,
            errorMessage: reminderRuns[0].errorMessage,
          }
        : null,
      runs: reminderRuns.map((run) => ({
        id: run.id,
        source: run.source,
        status: run.status,
        createdAt: run.createdAt,
        scanned: run.scanned,
        sent: run.sent,
        skipped: run.skipped,
        failed: run.failed,
        errorMessage: run.errorMessage,
      })),
    },
    notifications: notifications.map((notification) => ({
      id: notification.id,
      createdAt: notification.createdAt,
      sentAt: notification.sentAt,
      status: notification.status,
      channel: notification.channel,
      kind: notification.kind,
      recipientMasked: maskNotificationRecipient(notification.channel, notification.recipient),
      errorMessage: notification.errorMessage,
      booking: {
        id: notification.booking.id,
        customerName: notification.booking.customerName,
        serviceName: notification.booking.service.name,
        startsAt: notification.booking.startsAt,
      },
    })),
  };
}

export async function getBookingAgenda(input?: { date?: string; staffMemberId?: string }): Promise<BookingAgendaSnapshot> {
  const business = await getCurrentBusiness();
  const timeZone = getSafeTimeZone(business.timezone);
  const dateKey = input?.date && getZonedDayBounds(input.date, timeZone)
    ? input.date
    : getZonedDateKey(new Date(), timeZone);
  const dayBounds = getZonedDayBounds(dateKey, timeZone)!;

  const bookings = await db.booking.findMany({
    where: {
      businessId: business.id,
      startsAt: {
        lt: dayBounds.endExclusive,
      },
      endsAt: {
        gt: dayBounds.start,
      },
      ...(input?.staffMemberId ? { staffMemberId: input.staffMemberId } : {}),
    },
    include: {
      service: true,
      staffMember: true,
    },
    orderBy: { startsAt: "asc" },
  });
  const scheduleBlocks = await db.scheduleBlock.findMany({
    where: {
      businessId: business.id,
      startsAt: {
        lt: dayBounds.endExclusive,
      },
      endsAt: {
        gt: dayBounds.start,
      },
      ...(input?.staffMemberId ? { OR: [{ staffMemberId: input.staffMemberId }, { staffMemberId: null }] } : {}),
    },
    include: {
      staffMember: true,
    },
    orderBy: { startsAt: "asc" },
  });

  return {
    date: dateKey,
    staffMembers: business.staffMembers.map((member) => ({
      id: member.id,
      fullName: member.fullName,
    })),
    services: business.services
      .filter((service) => service.isActive)
      .map((service) => ({
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
      })),
    scheduleBlocks: scheduleBlocks.map((block) => ({
      id: block.id,
      startsAt: block.startsAt,
      endsAt: block.endsAt,
      reason: block.reason,
      staffMemberId: block.staffMemberId,
      staffName: block.staffMember?.fullName ?? null,
    })),
    bookings: bookings.map(mapBookingAgendaItem),
  };
}

export async function getBookingAgendaWeek(input?: {
  date?: string;
  staffMemberId?: string;
}): Promise<BookingAgendaWeekSnapshot> {
  const business = await getCurrentBusiness();
  const timeZone = getSafeTimeZone(business.timezone);
  const dateKey = input?.date && getZonedDayBounds(input.date, timeZone)
    ? input.date
    : getZonedDateKey(new Date(), timeZone);
  const weekDays = getWeekDateKeys(dateKey, 1);
  const weekStartBounds = getZonedDayBounds(weekDays[0] ?? dateKey, timeZone)!;
  const lastWeekDay = weekDays[weekDays.length - 1] ?? dateKey;
  const nextWeekDay = addDaysToDateKey(lastWeekDay, 1) ?? lastWeekDay;
  const weekEndExclusive = getZonedDayBounds(nextWeekDay, timeZone)?.start ?? weekStartBounds.endExclusive;

  const bookings = await db.booking.findMany({
    where: {
      businessId: business.id,
      startsAt: {
        lt: weekEndExclusive,
      },
      endsAt: {
        gt: weekStartBounds.start,
      },
      ...(input?.staffMemberId ? { staffMemberId: input.staffMemberId } : {}),
    },
    include: {
      service: true,
      staffMember: true,
    },
    orderBy: { startsAt: "asc" },
  });

  const grouped = Object.fromEntries(
    weekDays.map((day) => [day, [] as BookingAgendaItem[]])
  ) as Record<string, BookingAgendaItem[]>;

  for (const booking of bookings) {
    const key = getZonedDateKey(booking.startsAt, timeZone);
    if (grouped[key]) {
      grouped[key].push(mapBookingAgendaItem(booking));
    }
  }

  return {
    weekStart: weekDays[0] ?? dateKey,
    weekEnd: lastWeekDay,
    bookingsByDate: grouped,
  };
}

export async function getBookingAgendaView(input?: {
  date?: string;
  staffMemberId?: string;
}): Promise<BookingAgendaViewSnapshot> {
  const [agenda, week] = await Promise.all([getBookingAgenda(input), getBookingAgendaWeek(input)]);

  return {
    agenda,
    week,
  };
}

export async function createManualBooking(input: {
  serviceId: string;
  staffMemberId: string;
  startsAt: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  status?: "PENDING" | "CONFIRMED";
}) {
  const business = await getCurrentBusiness();
  const location = business.locations[0];
  const service = await db.service.findFirst({
    where: { id: input.serviceId, businessId: business.id, isActive: true },
  });
  const staffMember = await db.staffMember.findFirst({
    where: { id: input.staffMemberId, businessId: business.id, isActive: true },
    include: { services: true },
  });

  if (!location || !service || !staffMember) {
    throw new Error("DADOS_INVALIDOS");
  }

  if (!staffMember.services.some((assignment) => assignment.serviceId === service.id)) {
    throw new Error("PROFISSIONAL_INCOMPATIVEL");
  }

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("DATA_INVALIDA");
  }

  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

  const staffAvailabilities = await db.weeklyAvailability.findMany({
    where: { staffMemberId: staffMember.id },
  });
  const businessTimeZone = getSafeTimeZone(business.timezone);
  const bookingDay = getDayOfWeekForDateKey(getZonedDateKey(startsAt, businessTimeZone));
  const bookingTime = getZonedTimeValue(startsAt, businessTimeZone);
  const endTime = getZonedTimeValue(endsAt, businessTimeZone);
  const hasAvailability = staffAvailabilities.some(
    (slot) => bookingDay !== null && slot.dayOfWeek === bookingDay && slot.startTime <= bookingTime && slot.endTime >= endTime
  );
  if (!hasAvailability) {
    throw new Error("FORA_DA_DISPONIBILIDADE");
  }
  const customerInput = sanitizeBookingCustomerInput({
    fullName: input.customerName,
    email: input.customerEmail,
    phone: input.customerPhone,
  });
  const booking = await runBookingTransaction(async (tx) => {
    await assertSlotAvailable(tx, {
      businessId: business.id,
      staffMemberId: staffMember.id,
      startsAt,
      endsAt,
    });

    const customer = await upsertBookingCustomer(
      {
        businessId: business.id,
        fullName: customerInput.fullName,
        email: customerInput.email,
        phone: customerInput.phone,
        lastBookedAt: startsAt,
      },
      tx
    );

    return tx.booking.create({
      data: {
        businessId: business.id,
        locationId: location.id,
        serviceId: service.id,
        staffMemberId: staffMember.id,
        customerId: customer.id,
        status: input.status ?? "CONFIRMED",
        source: "MANUAL",
        paymentStatus: "UNPAID",
        publicToken: crypto.randomUUID(),
        startsAt,
        endsAt,
        priceCents: service.priceCents,
        customerName: customerInput.fullName,
        customerEmail: customerInput.email,
        customerPhone: customerInput.phone,
      },
      include: {
        service: true,
        staffMember: true,
      },
    });
  });

  if (booking.status === "CONFIRMED") {
    await sendBookingNotification(booking.id, "BOOKING_CONFIRMED");
  } else {
    await sendBookingNotification(booking.id, "BOOKING_CREATED");
  }

  return booking;
}

export async function createScheduleBlock(input: {
  startsAt: string;
  endsAt: string;
  reason?: string;
  staffMemberId?: string;
}) {
  const business = await getCurrentBusiness();
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    throw new Error("BLOQUEIO_INVALIDO");
  }

  if (input.staffMemberId) {
    const staffMember = await db.staffMember.findFirst({
      where: { id: input.staffMemberId, businessId: business.id },
    });

    if (!staffMember) {
      throw new Error("STAFF_NOT_FOUND");
    }
  }

  const conflictingBookings = await db.booking.count({
    where: {
      businessId: business.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(input.staffMemberId ? { staffMemberId: input.staffMemberId } : {}),
    },
  });

  if (conflictingBookings > 0) {
    throw new Error("BLOQUEIO_CONFLITO_RESERVAS");
  }

  return db.scheduleBlock.create({
    data: {
      businessId: business.id,
      staffMemberId: input.staffMemberId,
      startsAt,
      endsAt,
      reason: input.reason || null,
    },
  });
}

export async function deleteScheduleBlock(id: string) {
  const business = await getCurrentBusiness();
  const block = await db.scheduleBlock.findFirst({
    where: { id, businessId: business.id },
  });

  if (!block) {
    throw new Error("BLOQUEIO_NAO_ENCONTRADO");
  }

  await db.scheduleBlock.delete({
    where: { id },
  });
}

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export async function updateBookingStatus(
  id: string,
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
) {
  const business = await getCurrentBusiness();
  const booking = await db.booking.findFirst({
    where: { id, businessId: business.id },
  });

  if (!booking) {
    throw new Error("BOOKING_NOT_FOUND");
  }

  const allowed = VALID_STATUS_TRANSITIONS[booking.status] ?? [];
  if (!allowed.includes(status)) {
    throw new Error("TRANSICAO_INVALIDA");
  }

  const updated = await db.booking.update({
    where: { id },
    data: { status },
    include: {
      service: true,
      staffMember: true,
    },
  });

  if (status === "CONFIRMED") {
    await sendBookingNotification(updated.id, "BOOKING_CONFIRMED");
  }

  if (status === "CANCELLED") {
    await Promise.all([
      sendBookingNotification(updated.id, "BOOKING_CANCELLED"),
      sendRepresentativeBookingNotification(updated.id, "BOOKING_CANCELLED_INTERNAL"),
    ]);
  }

  return updated;
}

export async function updateDashboardBooking(
  id: string,
  input: {
    status?: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
    startsAt?: string;
    internalNotes?: string;
  }
) {
  const business = await getCurrentBusiness();
  const booking = await db.booking.findFirst({
    where: { id, businessId: business.id },
    include: {
      business: true,
      service: true,
      staffMember: {
        include: {
          services: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error("BOOKING_NOT_FOUND");
  }

  const nextStatus = input.status ?? booking.status;

  if (input.status && input.status !== booking.status) {
    const allowed = VALID_STATUS_TRANSITIONS[booking.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new Error("TRANSICAO_INVALIDA");
    }
  }

  let startsAt = booking.startsAt;
  let endsAt = booking.endsAt;

  if (input.startsAt) {
    if (!booking.staffMemberId || !booking.staffMember) {
      throw new Error("BOOKING_RESCHEDULE_NOT_ALLOWED");
    }

    const nextStartsAt = new Date(input.startsAt);
    if (Number.isNaN(nextStartsAt.getTime())) {
      throw new Error("DATA_INVALIDA");
    }

    if (!booking.staffMember.services.some((assignment) => assignment.serviceId === booking.serviceId)) {
      throw new Error("PROFISSIONAL_INCOMPATIVEL");
    }

    startsAt = nextStartsAt;
    endsAt = new Date(nextStartsAt.getTime() + booking.service.durationMinutes * 60_000);
  }

  const rescheduled = Boolean(input.startsAt) && startsAt.getTime() !== booking.startsAt.getTime();
  const staffMemberId = booking.staffMemberId;

  const updated = await (async () => {
    const updateData = {
      status: nextStatus,
      startsAt,
      endsAt,
      internalNotes: input.internalNotes === undefined ? booking.internalNotes : input.internalNotes || null,
    };
    const include = {
      business: true,
      service: true,
      staffMember: true,
    } as const;

    if (rescheduled && staffMemberId) {
      return runBookingTransaction(async (tx) => {
        await assertSlotAvailable(tx, {
          businessId: booking.businessId,
          staffMemberId,
          startsAt,
          endsAt,
          excludeBookingId: booking.id,
        });

        return tx.booking.update({ where: { id: booking.id }, data: updateData, include });
      });
    }

    return db.booking.update({ where: { id: booking.id }, data: updateData, include });
  })();

  if (input.startsAt && startsAt.getTime() !== booking.startsAt.getTime()) {
    await sendBookingNotification(updated.id, "BOOKING_RESCHEDULED");
  }

  if (booking.status !== nextStatus && nextStatus === "CONFIRMED") {
    await sendBookingNotification(updated.id, "BOOKING_CONFIRMED");
  }

  if (booking.status !== nextStatus && nextStatus === "CANCELLED") {
    await Promise.all([
      sendBookingNotification(updated.id, "BOOKING_CANCELLED"),
      sendRepresentativeBookingNotification(updated.id, "BOOKING_CANCELLED_INTERNAL"),
    ]);
  }

  return updated;
}

export async function retryCommunicationNotification(id: string) {
  const business = await getCurrentBusiness();
  const notification = await db.notificationLog.findFirst({
    where: {
      id,
      businessId: business.id,
    },
    select: {
      id: true,
      bookingId: true,
      channel: true,
      kind: true,
      status: true,
    },
  });

  if (!notification) {
    throw new Error("NOTIFICATION_NOT_FOUND");
  }

  return retryNotificationDelivery({
    bookingId: notification.bookingId,
    channel: notification.channel,
    kind: notification.kind,
  });
}
