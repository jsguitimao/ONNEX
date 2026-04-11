import { addDays, format, set } from "date-fns";
import { db } from "@/lib/db";
import { demoBusiness } from "@/lib/demo-data";

const DEMO_OWNER = {
  clerkUserId: "local-demo-owner",
  email: "owner@bukly.local",
  firstName: "Guilherme",
  lastName: "Owner",
};

const DEFAULT_AVAILABILITY = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
  { dayOfWeek: 2, startTime: "09:00", endTime: "18:00" },
  { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" },
  { dayOfWeek: 4, startTime: "09:00", endTime: "18:00" },
  { dayOfWeek: 5, startTime: "09:00", endTime: "19:00" },
  { dayOfWeek: 6, startTime: "10:00", endTime: "16:00" },
];

export type OnboardingDraft = {
  businessName: string;
  slug: string;
  city: string;
  phone: string;
  headline: string;
  subheadline: string;
  welcomeMessage: string;
  primaryColor: string;
  accentColor: string;
};

export type PublicBusinessPayload = {
  id: string;
  name: string;
  slug: string;
  city: string;
  phone: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  headline: string | null;
  subheadline: string | null;
  welcomeMessage: string | null;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    priceCents: number;
  }>;
  staffMembers: Array<{
    id: string;
    fullName: string;
    roleTitle: string | null;
    bio: string | null;
  }>;
};

export type BookingSlot = {
  iso: string;
  label: string;
};

export type AvailabilityInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type ManagementSnapshot = {
  businessId: string;
  businessName: string;
  slug: string;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    priceCents: number;
    isActive: boolean;
  }>;
  staffMembers: Array<{
    id: string;
    fullName: string;
    roleTitle: string | null;
    bio: string | null;
    isActive: boolean;
    serviceIds: string[];
    availability: AvailabilityInput[];
  }>;
};

export async function ensureDemoBusiness() {
  const owner = await db.user.upsert({
    where: { clerkUserId: DEMO_OWNER.clerkUserId },
    update: {},
    create: DEMO_OWNER,
  });

  const existingBusiness = await db.business.findUnique({
    where: { slug: demoBusiness.slug },
    include: {
      bookingPage: true,
      services: { orderBy: { displayOrder: "asc" } },
      staffMembers: {
        orderBy: { displayOrder: "asc" },
        include: {
          services: true,
          availabilities: true,
        },
      },
      locations: { where: { isDefault: true }, take: 1 },
      bookings: true,
    },
  });

  if (!existingBusiness) {
    const created = await db.business.create({
      data: {
        ownerId: owner.id,
        name: demoBusiness.name,
        slug: demoBusiness.slug,
        status: "ACTIVE",
        contactPhone: "+351 912 345 678",
        primaryColor: demoBusiness.primaryColor,
        accentColor: demoBusiness.accentColor,
        bookingPage: {
          create: {
            headline: demoBusiness.headline,
            subheadline: demoBusiness.subheadline,
            welcomeMessage: demoBusiness.welcomeMessage,
          },
        },
        locations: {
          create: {
            name: `${demoBusiness.name} ${demoBusiness.city}`,
            city: demoBusiness.city,
            isDefault: true,
          },
        },
        services: {
          create: demoBusiness.services.map((service, index) => ({
            name: service.name,
            slug: service.id,
            description: service.description,
            durationMinutes: service.durationMinutes,
            priceCents: service.priceCents,
            displayOrder: index,
          })),
        },
        staffMembers: {
          create: demoBusiness.team.map((member, index) => ({
            fullName: member.name,
            slug: member.id,
            roleTitle: member.role,
            bio: member.specialties.join(" · "),
            displayOrder: index,
          })),
        },
        subscription: {
          create: {
            tier: "FREE",
            status: "TRIALING",
            seats: demoBusiness.team.length,
          },
        },
      },
      include: {
        bookingPage: true,
        services: { orderBy: { displayOrder: "asc" } },
        staffMembers: {
          orderBy: { displayOrder: "asc" },
          include: {
            services: true,
            availabilities: true,
          },
        },
        locations: { where: { isDefault: true }, take: 1 },
        bookings: true,
      },
    });

    await hydrateOperationalData(created.id);
  } else {
    await hydrateOperationalData(existingBusiness.id);
  }

  return db.business.findUniqueOrThrow({
    where: { slug: demoBusiness.slug },
    include: {
      bookingPage: true,
      services: { orderBy: { displayOrder: "asc" } },
      staffMembers: {
        orderBy: { displayOrder: "asc" },
        include: {
          services: true,
          availabilities: true,
        },
      },
      locations: { where: { isDefault: true }, take: 1 },
      bookings: {
        include: {
          service: true,
          staffMember: true,
        },
        orderBy: { startsAt: "desc" },
      },
    },
  });
}

async function hydrateOperationalData(businessId: string) {
  const business = await db.business.findUniqueOrThrow({
    where: { id: businessId },
    include: {
      locations: { where: { isDefault: true }, take: 1 },
      services: { orderBy: { displayOrder: "asc" } },
      staffMembers: {
        orderBy: { displayOrder: "asc" },
        include: {
          services: true,
          availabilities: true,
        },
      },
      bookings: true,
    },
  });

  const location = business.locations[0];

  if (location) {
    await Promise.all(
      business.staffMembers
        .filter((member) => !member.locationId)
        .map((member) =>
          db.staffMember.update({
            where: { id: member.id },
            data: { locationId: location.id },
          })
        )
    );
  }

  for (const member of business.staffMembers) {
    if (member.services.length === 0) {
      await db.staffService.createMany({
        data: business.services.map((service) => ({
          staffMemberId: member.id,
          serviceId: service.id,
        })),
        skipDuplicates: true,
      });
    }

    if (member.availabilities.length === 0) {
      await db.weeklyAvailability.createMany({
        data: DEFAULT_AVAILABILITY.map((slot) => ({
          staffMemberId: member.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
        skipDuplicates: true,
      });
    }
  }

  if (business.bookings.length === 0 && location && business.services.length > 0 && business.staffMembers.length > 0) {
    const service = business.services[0];
    const staffMember = business.staffMembers[0];
    const start = set(addDays(new Date(), 1), { hours: 10, minutes: 0, seconds: 0, milliseconds: 0 });
    const end = new Date(start.getTime() + service.durationMinutes * 60_000);

    await db.booking.create({
      data: {
        businessId,
        locationId: location.id,
        serviceId: service.id,
        staffMemberId: staffMember.id,
        status: "CONFIRMED",
        source: "ONLINE",
        paymentStatus: "UNPAID",
        startsAt: start,
        endsAt: end,
        priceCents: service.priceCents,
        customerName: "Cliente Demo",
        customerEmail: "cliente.demo@bukly.local",
        customerPhone: "+351 910 000 000",
      },
    });
  }
}

export async function getBusinessForOnboarding() {
  const business = await ensureDemoBusiness();
  const location = business.locations[0];

  return {
    businessName: business.name,
    slug: business.slug,
    city: location?.city ?? demoBusiness.city,
    phone: business.contactPhone ?? "",
    headline: business.bookingPage?.headline ?? demoBusiness.headline,
    subheadline: business.bookingPage?.subheadline ?? demoBusiness.subheadline,
    welcomeMessage: business.bookingPage?.welcomeMessage ?? demoBusiness.welcomeMessage,
    primaryColor: business.primaryColor ?? demoBusiness.primaryColor,
    accentColor: business.accentColor ?? demoBusiness.accentColor,
  } satisfies OnboardingDraft;
}

export async function updateBusinessFromOnboarding(input: OnboardingDraft) {
  const business = await ensureDemoBusiness();

  return db.business.update({
    where: { id: business.id },
    data: {
      name: input.businessName,
      slug: input.slug,
      contactPhone: input.phone,
      primaryColor: input.primaryColor,
      accentColor: input.accentColor,
      bookingPage: {
        upsert: {
          create: {
            headline: input.headline,
            subheadline: input.subheadline,
            welcomeMessage: input.welcomeMessage,
          },
          update: {
            headline: input.headline,
            subheadline: input.subheadline,
            welcomeMessage: input.welcomeMessage,
          },
        },
      },
      locations: business.locations[0]
        ? {
            update: {
              where: { id: business.locations[0].id },
              data: {
                city: input.city,
                name: `${input.businessName} ${input.city}`.trim(),
              },
            },
          }
        : {
            create: {
              name: `${input.businessName} ${input.city}`.trim(),
              city: input.city,
              isDefault: true,
            },
          },
    },
  });
}

export async function getBusinessBySlug(slug: string) {
  await ensureDemoBusiness();

  const business = await db.business.findUnique({
    where: { slug },
    include: {
      bookingPage: true,
      services: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      },
      staffMembers: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      },
      locations: {
        where: { isDefault: true },
        take: 1,
      },
      subscription: true,
    },
  });

  if (!business) return null;

  return business;
}

export async function getPublicBusinessPayload(slug: string): Promise<PublicBusinessPayload | null> {
  const business = await getBusinessBySlug(slug);
  if (!business) return null;

  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    city: business.locations[0]?.city ?? "Portugal",
    phone: business.contactPhone,
    primaryColor: business.primaryColor,
    accentColor: business.accentColor,
    headline: business.bookingPage?.headline ?? null,
    subheadline: business.bookingPage?.subheadline ?? null,
    welcomeMessage: business.bookingPage?.welcomeMessage ?? null,
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

  const service = await db.service.findFirst({
    where: {
      id: input.serviceId,
      businessId: business.id,
      isActive: true,
    },
  });

  const staffMember = await db.staffMember.findFirst({
    where: {
      id: input.staffMemberId,
      businessId: business.id,
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

  const dayOfWeek = requestedDate.getDay();
  const windows = staffMember.availabilities.filter((slot) => slot.dayOfWeek === dayOfWeek);
  if (windows.length === 0) return [];

  const existingBookings = await db.booking.findMany({
    where: {
      businessId: business.id,
      staffMemberId: staffMember.id,
      startsAt: {
        gte: set(requestedDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }),
        lte: set(requestedDate, { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 }),
      },
      status: {
        notIn: ["CANCELLED", "NO_SHOW"],
      },
    },
    select: {
      startsAt: true,
      endsAt: true,
    },
  });

  const now = new Date();
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

      if (!overlaps && cursor > now) {
        slots.push({
          iso: cursor.toISOString(),
          label: format(cursor, "HH:mm"),
        });
      }

      cursor = new Date(cursor.getTime() + 30 * 60_000);
    }
  }

  return slots;
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
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
    throw new Error("DATA_INVALIDA");
  }

  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

  const conflict = await db.booking.findFirst({
    where: {
      businessId: business.id,
      staffMemberId: staffMember.id,
      status: {
        notIn: ["CANCELLED", "NO_SHOW"],
      },
      startsAt: {
        lt: endsAt,
      },
      endsAt: {
        gt: startsAt,
      },
    },
  });

  if (conflict) {
    throw new Error("HORARIO_OCUPADO");
  }

  const customer = await db.customer.upsert({
    where: {
      id: `${business.id}:${input.customerEmail?.toLowerCase() ?? input.customerPhone ?? input.customerName}`,
    },
    update: {
      fullName: input.customerName,
      email: input.customerEmail,
      phone: input.customerPhone,
      lastBookedAt: startsAt,
    },
    create: {
      id: `${business.id}:${input.customerEmail?.toLowerCase() ?? input.customerPhone ?? input.customerName}`,
      businessId: business.id,
      fullName: input.customerName,
      email: input.customerEmail,
      phone: input.customerPhone,
      lastBookedAt: startsAt,
    },
  });

  const booking = await db.booking.create({
    data: {
      businessId: business.id,
      locationId: location.id,
      serviceId: service.id,
      staffMemberId: staffMember.id,
      customerId: customer.id,
      status: "PENDING",
      source: "ONLINE",
      paymentStatus: "UNPAID",
      startsAt,
      endsAt,
      priceCents: service.priceCents,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
    },
    include: {
      service: true,
      staffMember: true,
    },
  });

  return booking;
}

export async function getDashboardSnapshot() {
  const business = await ensureDemoBusiness();

  const monthStart = set(new Date(), { date: 1, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
  const monthlyBookings = business.bookings.filter((booking) => booking.startsAt >= monthStart);
  const recentBookings = business.bookings.slice(0, 6).map((booking) => ({
    id: booking.id,
    customerName: booking.customerName,
    startsAt: booking.startsAt,
    status: booking.status,
    serviceName: booking.service.name,
    staffName: booking.staffMember?.fullName ?? "Sem profissional",
  }));

  return {
    businessName: business.name,
    slug: business.slug,
    servicesCount: business.services.length,
    staffCount: business.staffMembers.length,
    monthlyRevenueCents: monthlyBookings.reduce((sum, booking) => sum + booking.priceCents, 0),
    city: business.locations[0]?.city ?? demoBusiness.city,
    bookingsCount: business.bookings.length,
    recentBookings,
  };
}

export async function getManagementSnapshot(): Promise<ManagementSnapshot> {
  const business = await ensureDemoBusiness();

  return {
    businessId: business.id,
    businessName: business.name,
    slug: business.slug,
    services: business.services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      isActive: service.isActive,
    })),
    staffMembers: business.staffMembers.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      roleTitle: member.roleTitle,
      bio: member.bio,
      isActive: member.isActive,
      serviceIds: member.services.map((assignment) => assignment.serviceId),
      availability: member.availabilities
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
        .map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
    })),
  };
}

export async function createService(input: {
  name: string;
  description?: string;
  durationMinutes: number;
  priceCents: number;
}) {
  const business = await ensureDemoBusiness();

  const displayOrder = business.services.length;

  return db.service.create({
    data: {
      businessId: business.id,
      name: input.name,
      description: input.description || null,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
      displayOrder,
    },
  });
}

export async function updateService(
  id: string,
  input: {
    name: string;
    description?: string;
    durationMinutes: number;
    priceCents: number;
    isActive: boolean;
  }
) {
  const business = await ensureDemoBusiness();

  return db.service.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description || null,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
      isActive: input.isActive,
      businessId: business.id,
    },
  });
}

export async function createStaffMember(input: {
  fullName: string;
  roleTitle?: string;
  bio?: string;
  serviceIds: string[];
  availability: AvailabilityInput[];
}) {
  const business = await ensureDemoBusiness();
  const location = business.locations[0];

  const staffMember = await db.staffMember.create({
    data: {
      businessId: business.id,
      locationId: location?.id,
      fullName: input.fullName,
      roleTitle: input.roleTitle || null,
      bio: input.bio || null,
      displayOrder: business.staffMembers.length,
    },
  });

  if (input.serviceIds.length > 0) {
    await db.staffService.createMany({
      data: input.serviceIds.map((serviceId) => ({
        staffMemberId: staffMember.id,
        serviceId,
      })),
      skipDuplicates: true,
    });
  }

  await replaceStaffAvailability(staffMember.id, input.availability);

  return staffMember;
}

export async function updateStaffMember(
  id: string,
  input: {
    fullName: string;
    roleTitle?: string;
    bio?: string;
    isActive: boolean;
    serviceIds: string[];
    availability: AvailabilityInput[];
  }
) {
  await ensureDemoBusiness();

  const staffMember = await db.staffMember.update({
    where: { id },
    data: {
      fullName: input.fullName,
      roleTitle: input.roleTitle || null,
      bio: input.bio || null,
      isActive: input.isActive,
    },
  });

  await db.staffService.deleteMany({
    where: { staffMemberId: id },
  });

  if (input.serviceIds.length > 0) {
    await db.staffService.createMany({
      data: input.serviceIds.map((serviceId) => ({
        staffMemberId: id,
        serviceId,
      })),
      skipDuplicates: true,
    });
  }

  await replaceStaffAvailability(id, input.availability);

  return staffMember;
}

async function replaceStaffAvailability(staffMemberId: string, availability: AvailabilityInput[]) {
  await db.weeklyAvailability.deleteMany({
    where: { staffMemberId },
  });

  if (availability.length > 0) {
    await db.weeklyAvailability.createMany({
      data: availability.map((slot) => ({
        staffMemberId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
    });
  }
}
