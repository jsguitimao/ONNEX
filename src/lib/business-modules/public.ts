import { getBookableRange, getBookingPolicySettings, getCancellationDeadline } from "@/lib/booking-policy";
import { sanitizeBookingCustomerInput } from "@/lib/customer-identity";
import { db } from "@/lib/db";
import { assertSlotAvailable, runBookingTransaction } from "@/lib/booking-transaction";
import {
  sendBookingNotification,
  sendRepresentativeBookingNotification,
  sendStaffBookingNotification,
} from "@/lib/notifications";
import { captureException } from "@/lib/observability";
import {
  createPublicBookingToken,
  getPublicBookingTokenExpiresAt,
  isPublicBookingTokenExpired,
} from "@/lib/public-booking-token";
import {
  getDayOfWeekForDateKey,
  getSafeTimeZone,
  getZonedDateKey,
  getZonedDayBounds,
  getZonedTimeValue,
  zonedTimeToUtc,
} from "@/lib/timezone";
import { upsertBookingCustomer } from "./customers";
import { getBusinessBySlug } from "./core";
import type { BookingSlot, PublicBookingDetails, PublicBusinessPayload } from "./types";

async function listBookingSlots(input: {
  businessId: string;
  onlineBooking: boolean;
  bookingLeadTimeHours?: number | null;
  bookingWindowDays?: number | null;
  slotIntervalMinutes?: number | null;
  timezone?: string | null;
  serviceId: string;
  staffMemberId: string;
  date: string;
  ignoreBookingId?: string;
}) {
  if (!input.onlineBooking) return [];

  const policy = getBookingPolicySettings(input);
  const { minBookableAt, maxBookableAt } = getBookableRange(input);
  const timeZone = getSafeTimeZone(input.timezone);

  const service = await db.service.findFirst({
    where: {
      id: input.serviceId,
      businessId: input.businessId,
      isActive: true,
      deletedAt: null,
    },
  });

  const staffMember = await db.staffMember.findFirst({
    where: {
      id: input.staffMemberId,
      businessId: input.businessId,
      isActive: true,
      deletedAt: null,
    },
    include: {
      availabilities: {
        where: { isActive: true },
      },
      services: true,
    },
  });

  if (!service || !staffMember) return [];

  const hasService = staffMember.services.some((assignment) => assignment.serviceId === service.id);
  if (!hasService) return [];

  const dayBounds = getZonedDayBounds(input.date, timeZone);
  const dayOfWeek = getDayOfWeekForDateKey(input.date);
  if (!dayBounds || dayOfWeek === null) return [];
  if (dayBounds.endExclusive <= minBookableAt || dayBounds.start > maxBookableAt) return [];

  const windows = staffMember.availabilities.filter((slot) => slot.dayOfWeek === dayOfWeek);
  if (windows.length === 0) return [];

  const existingBookings = await db.booking.findMany({
    where: {
      businessId: input.businessId,
      staffMemberId: staffMember.id,
      startsAt: {
        lt: dayBounds.endExclusive,
      },
      endsAt: {
        gt: dayBounds.start,
      },
      status: {
        notIn: ["CANCELLED", "NO_SHOW"],
      },
      ...(input.ignoreBookingId ? { id: { not: input.ignoreBookingId } } : {}),
    },
    select: {
      startsAt: true,
      endsAt: true,
    },
  });

  const scheduleBlocks = await db.scheduleBlock.findMany({
    where: {
      businessId: input.businessId,
      OR: [{ staffMemberId: staffMember.id }, { staffMemberId: null }],
      startsAt: {
        lt: dayBounds.endExclusive,
      },
      endsAt: {
        gt: dayBounds.start,
      },
    },
    select: {
      startsAt: true,
      endsAt: true,
    },
  });

  const slots: BookingSlot[] = [];

  for (const window of windows) {
    const cursorStart = zonedTimeToUtc(input.date, window.startTime, timeZone);
    const windowEnd = zonedTimeToUtc(input.date, window.endTime, timeZone);
    if (!cursorStart || !windowEnd) continue;
    let cursor = cursorStart;

    while (cursor.getTime() + service.durationMinutes * 60_000 <= windowEnd.getTime()) {
      const candidateEnd = new Date(cursor.getTime() + service.durationMinutes * 60_000);
      const overlaps = existingBookings.some(
        (booking) => cursor < booking.endsAt && candidateEnd > booking.startsAt
      );
      const overlapsBlock = scheduleBlocks.some(
        (block) => cursor < block.endsAt && candidateEnd > block.startsAt
      );

      if (!overlaps && !overlapsBlock && cursor >= minBookableAt && candidateEnd <= maxBookableAt) {
        slots.push({
          iso: cursor.toISOString(),
          label: getZonedTimeValue(cursor, timeZone),
        });
      }

      cursor = new Date(cursor.getTime() + policy.slotIntervalMinutes * 60_000);
    }
  }

  return slots;
}

async function assertPublicSlotIsBookable(input: {
  businessId: string;
  onlineBooking: boolean;
  bookingLeadTimeHours?: number | null;
  bookingWindowDays?: number | null;
  slotIntervalMinutes?: number | null;
  timezone?: string | null;
  serviceId: string;
  staffMemberId: string;
  startsAt: Date;
  ignoreBookingId?: string;
}) {
  const date = getZonedDateKey(input.startsAt, getSafeTimeZone(input.timezone));
  const slots = await listBookingSlots({
    ...input,
    date,
  });
  const isBookable = slots.some((slot) => slot.iso === input.startsAt.toISOString());

  if (!isBookable) {
    throw new Error("FORA_DA_DISPONIBILIDADE");
  }
}

function buildPublicBookingDetails(booking: {
  id: string;
  publicToken: string | null;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  startsAt: Date;
  endsAt: Date;
  updatedAt: Date;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerConfirmedAt: Date | null;
  service: { id: string; name: string };
  staffMember: { id: string; fullName: string } | null;
  business: {
    name: string;
    slug: string;
    bookingLeadTimeHours?: number | null;
    bookingWindowDays?: number | null;
    cancellationWindowHours?: number | null;
  };
}): PublicBookingDetails {
  const cancellationDeadline = getCancellationDeadline(booking.startsAt, booking.business);
  const tokenExpiresAt = getPublicBookingTokenExpiresAt(booking);
  const canManageTime =
    ["PENDING", "CONFIRMED"].includes(booking.status) &&
    new Date() < cancellationDeadline &&
    !isPublicBookingTokenExpired(booking);
  const policy = getBookingPolicySettings(booking.business);

  return {
    id: booking.id,
    publicToken: booking.publicToken ?? "",
    tokenExpiresAt,
    status: booking.status,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    serviceId: booking.service.id,
    staffMemberId: booking.staffMember?.id ?? null,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    serviceName: booking.service.name,
    staffName: booking.staffMember?.fullName ?? null,
    businessName: booking.business.name,
    businessSlug: booking.business.slug,
    canConfirm: booking.status === "PENDING" && new Date() < booking.startsAt,
    canCancel: canManageTime,
    canReschedule: canManageTime && Boolean(booking.staffMember?.id),
    canReconfirm:
      ["PENDING", "CONFIRMED"].includes(booking.status) &&
      !booking.customerConfirmedAt &&
      new Date() < booking.startsAt,
    customerConfirmedAt: booking.customerConfirmedAt,
    cancellationWindowHours: policy.cancellationWindowHours,
    cancellationDeadline,
    bookingLeadTimeHours: policy.bookingLeadTimeHours,
    bookingWindowDays: policy.bookingWindowDays,
  };
}

function ensureActivePublicToken<T extends { publicToken: string | null; endsAt: Date; updatedAt: Date }>(
  booking: T | null
) {
  if (!booking || !booking.publicToken) {
    return null;
  }

  if (isPublicBookingTokenExpired(booking)) {
    return null;
  }

  return booking;
}

export async function listPublicBusinessSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return db.business.findMany({
    where: { status: "ACTIVE" },
    select: { slug: true, updatedAt: true },
  });
}

export async function getPublicBusinessPayload(slug: string): Promise<PublicBusinessPayload | null> {
  const business = await getBusinessBySlug(slug);
  if (!business) return null;
  const policy = getBookingPolicySettings(business);

  const primaryLocation = business.locations[0];
  const mapsAddress = primaryLocation
    ? [
        primaryLocation.addressLine1,
        primaryLocation.addressLine2,
        [primaryLocation.postalCode, primaryLocation.city].filter(Boolean).join(" "),
        primaryLocation.countryCode,
      ]
        .filter((part): part is string => Boolean(part?.trim()))
        .join(", ") || null
    : null;

  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    city: primaryLocation?.city ?? "Portugal",
    mapsAddress,
    phone: business.contactPhone,
    instagramUrl: business.instagramUrl,
    tiktokUrl: business.tiktokUrl,
    facebookUrl: business.facebookUrl,
    description: business.description,
    primaryColor: business.primaryColor,
    accentColor: business.accentColor,
    logoUrl: business.logoUrl,
    coverImageUrl: business.coverImageUrl,
    heroImageUrl: business.bookingPage?.heroImageUrl ?? null,
    headline: business.bookingPage?.headline ?? null,
    onlineBooking: business.onlineBooking,
    theme: business.bookingPage?.theme === "light" ? "light" : "dark",
    showTeam: business.bookingPage?.showTeam ?? true,
    showPrices: business.bookingPage?.showPrices ?? true,
    showDurations: business.bookingPage?.showDurations ?? true,
    bookingLeadTimeHours: policy.bookingLeadTimeHours,
    bookingWindowDays: policy.bookingWindowDays,
    slotIntervalMinutes: policy.slotIntervalMinutes,
    cancellationWindowHours: policy.cancellationWindowHours,
    timezone: business.timezone,
    services: business.services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
    })),
    staffMembers: business.staffMembers.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      roleTitle: member.roleTitle,
      bio: member.bio,
      avatarUrl: member.avatarUrl ?? null,
      portfolioImages: Array.isArray(member.portfolioImages)
        ? (member.portfolioImages as unknown[]).filter((v): v is string => typeof v === "string")
        : [],
      serviceIds: member.services.map((assignment) => assignment.serviceId),
    })),
  };
}

export async function getAvailableSlots(input: {
  slug: string;
  serviceId: string;
  staffMemberId: string;
  date: string;
}) {
  const business = await getBusinessBySlug(input.slug);
  if (!business) return [];

  return listBookingSlots({
    businessId: business.id,
    onlineBooking: business.onlineBooking,
    bookingLeadTimeHours: business.bookingLeadTimeHours,
    bookingWindowDays: business.bookingWindowDays,
    slotIntervalMinutes: business.slotIntervalMinutes,
    timezone: business.timezone,
    serviceId: input.serviceId,
    staffMemberId: input.staffMemberId,
    date: input.date,
  });
}

export async function getPublicBookingRescheduleSlots(token: string, date: string) {
  const booking = ensureActivePublicToken(
    await db.booking.findUnique({
      where: { publicToken: token },
      include: {
        business: true,
        service: true,
        staffMember: true,
      },
    })
  );

  if (!booking || !booking.staffMemberId) return null;

  return listBookingSlots({
    businessId: booking.businessId,
    onlineBooking: booking.business.onlineBooking,
    bookingLeadTimeHours: booking.business.bookingLeadTimeHours,
    bookingWindowDays: booking.business.bookingWindowDays,
    slotIntervalMinutes: booking.business.slotIntervalMinutes,
    timezone: booking.business.timezone,
    serviceId: booking.serviceId,
    staffMemberId: booking.staffMemberId,
    date,
    ignoreBookingId: booking.id,
  });
}

export async function createPublicBooking(input: {
  slug: string;
  serviceId: string;
  staffMemberId: string;
  startsAt: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}) {
  const business = await getBusinessBySlug(input.slug);
  if (!business) {
    throw new Error("NEGOCIO_NAO_ENCONTRADO");
  }
  if (!business.onlineBooking) {
    throw new Error("ONLINE_BOOKING_DISABLED");
  }

  const { minBookableAt, maxBookableAt } = getBookableRange(business);

  const service = await db.service.findFirst({
    where: { id: input.serviceId, businessId: business.id, isActive: true, deletedAt: null },
  });
  const staffMember = await db.staffMember.findFirst({
    where: { id: input.staffMemberId, businessId: business.id, isActive: true, deletedAt: null },
    include: { services: true },
  });
  const location = business.locations[0];

  if (!service || !staffMember || !location) {
    throw new Error("DADOS_INVALIDOS");
  }

  if (!staffMember.services.some((assignment) => assignment.serviceId === service.id)) {
    throw new Error("PROFISSIONAL_INCOMPATIVEL");
  }

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime()) || startsAt < minBookableAt || startsAt > maxBookableAt) {
    throw new Error("DATA_INVALIDA");
  }

  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
  await assertPublicSlotIsBookable({
    businessId: business.id,
    onlineBooking: business.onlineBooking,
    bookingLeadTimeHours: business.bookingLeadTimeHours,
    bookingWindowDays: business.bookingWindowDays,
    slotIntervalMinutes: business.slotIntervalMinutes,
    timezone: business.timezone,
    serviceId: service.id,
    staffMemberId: staffMember.id,
    startsAt,
  });
  const publicToken = createPublicBookingToken();
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
        status: (staffMember.autoAcceptBookings || business.autoAcceptBookings) ? "CONFIRMED" : "PENDING",
        source: "ONLINE",
        paymentStatus: "UNPAID",
        publicToken,
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

  const autoAccept = booking.staffMember?.autoAcceptBookings || business.autoAcceptBookings;
  if (autoAccept) {
    await sendBookingNotification(booking.id, "BOOKING_CONFIRMED");
  } else {
    await sendBookingNotification(booking.id, "BOOKING_CREATED");
  }

  if (booking.staffMember) {
    try {
      await sendStaffBookingNotification(
        booking.id,
        autoAccept ? "BOOKING_STAFF_NEW_BOOKING" : "BOOKING_STAFF_PENDING_REQUEST",
      );
    } catch (error) {
      captureException("public.create_booking.staff_notification_failed", error, {
        bookingId: booking.id,
        autoAccept,
      });
    }
  }

  return booking;
}

export async function getPublicBookingByToken(token: string): Promise<PublicBookingDetails | null> {
  const booking = ensureActivePublicToken(
    await db.booking.findUnique({
      where: { publicToken: token },
      include: {
        business: true,
        service: true,
        staffMember: true,
      },
    })
  );

  if (!booking) return null;

  return buildPublicBookingDetails(booking);
}

export async function updatePublicBookingByToken(
  token: string,
  action: "confirm" | "cancel" | "reconfirm"
): Promise<PublicBookingDetails | null> {
  const booking = await db.booking.findUnique({
    where: { publicToken: token },
    include: {
      business: true,
      service: true,
      staffMember: true,
    },
  });

  if (!booking) return null;
  if (isPublicBookingTokenExpired(booking)) {
    throw new Error("BOOKING_TOKEN_EXPIRED");
  }

  if (action === "reconfirm") {
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      throw new Error("BOOKING_ACTION_NOT_ALLOWED");
    }

    const updated = await db.booking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        customerConfirmedAt: new Date(),
      },
      include: {
        business: true,
        service: true,
        staffMember: true,
      },
    });

    if (booking.status === "PENDING") {
      await sendBookingNotification(updated.id, "BOOKING_CONFIRMED");
    }

    return buildPublicBookingDetails(updated);
  }

  if (action === "confirm" && booking.status !== "PENDING") {
    throw new Error("BOOKING_ACTION_NOT_ALLOWED");
  }

  if (action === "cancel" && !["PENDING", "CONFIRMED"].includes(booking.status)) {
    throw new Error("BOOKING_ACTION_NOT_ALLOWED");
  }
  if (action === "cancel" && new Date() >= getCancellationDeadline(booking.startsAt, booking.business)) {
    throw new Error("CANCEL_WINDOW_EXPIRED");
  }

  const updated = await db.booking.update({
    where: { id: booking.id },
    data: {
      status: action === "confirm" ? "CONFIRMED" : "CANCELLED",
      customerConfirmedAt: action === "confirm" ? new Date() : undefined,
      publicToken: createPublicBookingToken(),
    },
    include: {
      business: true,
      service: true,
      staffMember: true,
    },
  });

  if (action === "confirm") {
    await sendBookingNotification(updated.id, "BOOKING_CONFIRMED");
  } else {
    await Promise.all([
      sendBookingNotification(updated.id, "BOOKING_CANCELLED"),
      sendRepresentativeBookingNotification(updated.id, "BOOKING_CANCELLED_INTERNAL"),
    ]);
  }

  return buildPublicBookingDetails(updated);
}

export async function reschedulePublicBookingByToken(
  token: string,
  startsAtIso: string
): Promise<PublicBookingDetails | null> {
  const booking = await db.booking.findUnique({
    where: { publicToken: token },
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

  if (!booking || !booking.staffMemberId || !booking.staffMember) return null;
  if (isPublicBookingTokenExpired(booking)) {
    throw new Error("BOOKING_TOKEN_EXPIRED");
  }

  if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
    throw new Error("BOOKING_ACTION_NOT_ALLOWED");
  }

  if (new Date() >= getCancellationDeadline(booking.startsAt, booking.business)) {
    throw new Error("RESCHEDULE_WINDOW_EXPIRED");
  }

  const startsAt = new Date(startsAtIso);
  const { minBookableAt, maxBookableAt } = getBookableRange(booking.business);
  if (Number.isNaN(startsAt.getTime()) || startsAt < minBookableAt || startsAt > maxBookableAt) {
    throw new Error("DATA_INVALIDA");
  }

  if (!booking.staffMember.services.some((assignment) => assignment.serviceId === booking.serviceId)) {
    throw new Error("PROFISSIONAL_INCOMPATIVEL");
  }

  const endsAt = new Date(startsAt.getTime() + booking.service.durationMinutes * 60_000);
  const staffMemberId = booking.staffMemberId;
  await assertPublicSlotIsBookable({
    businessId: booking.businessId,
    onlineBooking: booking.business.onlineBooking,
    bookingLeadTimeHours: booking.business.bookingLeadTimeHours,
    bookingWindowDays: booking.business.bookingWindowDays,
    slotIntervalMinutes: booking.business.slotIntervalMinutes,
    timezone: booking.business.timezone,
    serviceId: booking.serviceId,
    staffMemberId,
    startsAt,
    ignoreBookingId: booking.id,
  });

  const updated = await runBookingTransaction(async (tx) => {
    await assertSlotAvailable(tx, {
      businessId: booking.businessId,
      staffMemberId,
      startsAt,
      endsAt,
      excludeBookingId: booking.id,
    });

    return tx.booking.update({
      where: { id: booking.id },
      data: {
        startsAt,
        endsAt,
        publicToken: createPublicBookingToken(),
      },
      include: {
        business: true,
        service: true,
        staffMember: true,
      },
    });
  });

  await sendBookingNotification(updated.id, "BOOKING_RESCHEDULED");

  return buildPublicBookingDetails(updated);
}
