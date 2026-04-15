import { format, set } from "date-fns";
import { getBookableRange, getBookingPolicySettings, getCancellationDeadline } from "@/lib/booking-policy";
import { sanitizeBookingCustomerInput } from "@/lib/customer-identity";
import { db } from "@/lib/db";
import { assertSlotAvailable, runBookingTransaction } from "@/lib/booking-transaction";
import { sendBookingNotification, sendRepresentativeBookingNotification } from "@/lib/notifications";
import {
  createPublicBookingToken,
  getPublicBookingTokenExpiresAt,
  isPublicBookingTokenExpired,
} from "@/lib/public-booking-token";
import { upsertBookingCustomer } from "./customers";
import { getBusinessBySlug } from "./core";
import type { BookingSlot, PublicBookingDetails, PublicBusinessPayload } from "./types";

async function listBookingSlots(input: {
  businessId: string;
  onlineBooking: boolean;
  bookingLeadTimeHours?: number | null;
  bookingWindowDays?: number | null;
  slotIntervalMinutes?: number | null;
  serviceId: string;
  staffMemberId: string;
  date: string;
  ignoreBookingId?: string;
}) {
  if (!input.onlineBooking) return [];

  const policy = getBookingPolicySettings(input);
  const { minBookableAt, maxBookableAt } = getBookableRange(input);

  const service = await db.service.findFirst({
    where: {
      id: input.serviceId,
      businessId: input.businessId,
      isActive: true,
    },
  });

  const staffMember = await db.staffMember.findFirst({
    where: {
      id: input.staffMemberId,
      businessId: input.businessId,
      isActive: true,
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

  const requestedDate = new Date(`${input.date}T00:00:00`);
  if (Number.isNaN(requestedDate.getTime())) return [];
  const dayStart = set(requestedDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
  const dayEnd = set(requestedDate, { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 });
  if (dayEnd < minBookableAt || dayStart > maxBookableAt) return [];

  const dayOfWeek = requestedDate.getDay();
  const windows = staffMember.availabilities.filter((slot) => slot.dayOfWeek === dayOfWeek);
  if (windows.length === 0) return [];

  const existingBookings = await db.booking.findMany({
    where: {
      businessId: input.businessId,
      staffMemberId: staffMember.id,
      startsAt: {
        lt: dayEnd,
      },
      endsAt: {
        gt: dayStart,
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
        lt: dayEnd,
      },
      endsAt: {
        gt: dayStart,
      },
    },
    select: {
      startsAt: true,
      endsAt: true,
    },
  });

  const slots: BookingSlot[] = [];

  for (const window of windows) {
    const [startHour, startMinute] = window.startTime.split(":").map(Number);
    const [endHour, endMinute] = window.endTime.split(":").map(Number);
    let cursor = set(requestedDate, {
      hours: startHour,
      minutes: startMinute,
      seconds: 0,
      milliseconds: 0,
    });
    const windowEnd = set(requestedDate, {
      hours: endHour,
      minutes: endMinute,
      seconds: 0,
      milliseconds: 0,
    });

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
          label: format(cursor, "HH:mm"),
        });
      }

      cursor = new Date(cursor.getTime() + policy.slotIntervalMinutes * 60_000);
    }
  }

  return slots;
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

export async function getPublicBusinessPayload(slug: string): Promise<PublicBusinessPayload | null> {
  const business = await getBusinessBySlug(slug);
  if (!business) return null;
  const policy = getBookingPolicySettings(business);

  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    city: business.locations[0]?.city ?? "Portugal",
    phone: business.contactPhone,
    contactEmail: business.contactEmail,
    websiteUrl: business.websiteUrl,
    description: business.description,
    primaryColor: business.primaryColor,
    accentColor: business.accentColor,
    logoUrl: business.logoUrl,
    coverImageUrl: business.coverImageUrl,
    headline: business.bookingPage?.headline ?? null,
    subheadline: business.bookingPage?.subheadline ?? null,
    welcomeMessage: business.bookingPage?.welcomeMessage ?? null,
    onlineBooking: business.onlineBooking,
    showTeam: business.bookingPage?.showTeam ?? true,
    showPrices: business.bookingPage?.showPrices ?? true,
    showDurations: business.bookingPage?.showDurations ?? true,
    bookingLeadTimeHours: policy.bookingLeadTimeHours,
    bookingWindowDays: policy.bookingWindowDays,
    slotIntervalMinutes: policy.slotIntervalMinutes,
    cancellationWindowHours: policy.cancellationWindowHours,
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
    where: { id: input.serviceId, businessId: business.id, isActive: true },
  });
  const staffMember = await db.staffMember.findFirst({
    where: { id: input.staffMemberId, businessId: business.id, isActive: true },
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
        status: "PENDING",
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

  await sendBookingNotification(booking.id, "BOOKING_CREATED");

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
  action: "confirm" | "cancel"
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
