import { auth, currentUser } from "@clerk/nextjs/server";
import { addDays, format, set } from "date-fns";
import { db } from "@/lib/db";
import { demoBusiness } from "@/lib/demo-data";
import { sendBookingNotification } from "@/lib/notifications";

const DEMO_OWNER = {
  clerkUserId: "local-demo-owner",
  email: "owner@bukbarbearia.local",
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

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function ensureUniqueSlug(seed: string) {
  const base = slugify(seed) || "meu-estudio";

  for (let index = 0; index < 50; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    const exists = await db.business.findUnique({ where: { slug: candidate } });

    if (!exists) {
      return candidate;
    }
  }

  return `${base}-${Date.now().toString().slice(-6)}`;
}

function getPrimaryEmailAddress(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) return null;

  return (
    user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null
  );
}

async function getCurrentBusiness() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("AUTH_REQUIRED");
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("AUTH_REQUIRED");
  }

  const email = getPrimaryEmailAddress(clerkUser);
  if (!email) {
    throw new Error("AUTH_REQUIRED");
  }

  const appUser = await db.user.upsert({
    where: { clerkUserId: userId },
    update: {
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      avatarUrl: clerkUser.imageUrl,
    },
    create: {
      clerkUserId: userId,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      avatarUrl: clerkUser.imageUrl,
    },
  });

  const existingBusiness = await db.business.findFirst({
    where: { ownerId: appUser.id },
    orderBy: { createdAt: "asc" },
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

  if (existingBusiness) {
    await hydrateOperationalData(existingBusiness.id, { seedBooking: false });
    return db.business.findUniqueOrThrow({
      where: { id: existingBusiness.id },
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

  const ownerName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() || "Novo Studio";
  const businessName = clerkUser.firstName ? `${clerkUser.firstName} Studio` : "Meu Studio";
  const businessSlug = await ensureUniqueSlug(clerkUser.username || email.split("@")[0] || ownerName);

  const createdBusiness = await db.business.create({
    data: {
      ownerId: appUser.id,
      name: businessName,
      slug: businessSlug,
      status: "ACTIVE",
      contactEmail: email,
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
          name: `${businessName} Lisboa`,
          city: "Lisboa",
          isDefault: true,
        },
      },
      services: {
        create: demoBusiness.services.map((service, index) => ({
          name: service.name,
          slug: `${slugify(service.name)}-${index + 1}`,
          description: service.description,
          durationMinutes: service.durationMinutes,
          priceCents: service.priceCents,
          displayOrder: index,
        })),
      },
      staffMembers: {
        create: {
          fullName: ownerName,
          slug: slugify(ownerName),
          roleTitle: "Founder",
          bio: "Responsavel pelo atendimento e pela experiencia do negocio.",
          displayOrder: 0,
        },
      },
      subscription: {
        create: {
          tier: "FREE",
          status: "TRIALING",
          seats: 1,
        },
      },
    },
  });

  await hydrateOperationalData(createdBusiness.id, { seedBooking: false });

  return db.business.findUniqueOrThrow({
    where: { id: createdBusiness.id },
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

export type PublicBookingDetails = {
  id: string;
  publicToken: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  startsAt: Date;
  endsAt: Date;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  serviceName: string;
  staffName: string | null;
  businessName: string;
  businessSlug: string;
  canConfirm: boolean;
  canCancel: boolean;
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

export type BookingAgendaItem = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  source: "ONLINE" | "MANUAL" | "IMPORTED";
  priceCents: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  serviceName: string;
  staffName: string;
};

export type BookingAgendaSnapshot = {
  date: string;
  staffMembers: Array<{
    id: string;
    fullName: string;
  }>;
  services: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    priceCents: number;
  }>;
  scheduleBlocks: Array<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    reason: string | null;
    staffMemberId: string | null;
    staffName: string | null;
  }>;
  bookings: BookingAgendaItem[];
};

export type CustomerSnapshot = {
  customers: Array<{
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    marketingOptIn: boolean;
    lastBookedAt: Date | null;
    totalBookings: number;
    totalSpentCents: number;
    lastServiceName: string | null;
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

async function hydrateOperationalData(
  businessId: string,
  options: {
    seedBooking?: boolean;
  } = {}
) {
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

  if (
    options.seedBooking !== false &&
    business.bookings.length === 0 &&
    location &&
    business.services.length > 0 &&
    business.staffMembers.length > 0
  ) {
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
        customerEmail: "cliente.demo@bukbarbearia.local",
        customerPhone: "+351 910 000 000",
      },
    });
  }
}

export async function getBusinessForOnboarding() {
  const business = await getCurrentBusiness();
  const location = business.locations[0];

  return {
    businessName: business.name,
    slug: business.slug,
    city: location?.city ?? "Lisboa",
    phone: business.contactPhone ?? "",
    headline: business.bookingPage?.headline ?? demoBusiness.headline,
    subheadline: business.bookingPage?.subheadline ?? demoBusiness.subheadline,
    welcomeMessage: business.bookingPage?.welcomeMessage ?? demoBusiness.welcomeMessage,
    primaryColor: business.primaryColor ?? demoBusiness.primaryColor,
    accentColor: business.accentColor ?? demoBusiness.accentColor,
  } satisfies OnboardingDraft;
}

export async function updateBusinessFromOnboarding(input: OnboardingDraft) {
  const business = await getCurrentBusiness();

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
  const scheduleBlocks = await db.scheduleBlock.findMany({
    where: {
      businessId: business.id,
      OR: [{ staffMemberId: staffMember.id }, { staffMemberId: null }],
      startsAt: {
        gte: set(requestedDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }),
        lte: set(requestedDate, { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 }),
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
      const overlapsBlock = scheduleBlocks.some(
        (block) => cursor < block.endsAt && candidateEnd > block.startsAt
      );

      if (!overlaps && !overlapsBlock && cursor > now) {
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
  const publicToken = crypto.randomUUID();

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

  const blocked = await db.scheduleBlock.findFirst({
    where: {
      businessId: business.id,
      OR: [{ staffMemberId: staffMember.id }, { staffMemberId: null }],
      startsAt: {
        lt: endsAt,
      },
      endsAt: {
        gt: startsAt,
      },
    },
  });

  if (blocked) {
    throw new Error("HORARIO_BLOQUEADO");
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
      publicToken,
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

  await sendBookingNotification(booking.id, "BOOKING_CREATED");

  return booking;
}

export async function getPublicBookingByToken(token: string): Promise<PublicBookingDetails | null> {
  const booking = await db.booking.findUnique({
    where: { publicToken: token },
    include: {
      business: true,
      service: true,
      staffMember: true,
    },
  });

  if (!booking) return null;

  return {
    id: booking.id,
    publicToken: booking.publicToken ?? "",
    status: booking.status,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    serviceName: booking.service.name,
    staffName: booking.staffMember?.fullName ?? null,
    businessName: booking.business.name,
    businessSlug: booking.business.slug,
    canConfirm: booking.status === "PENDING",
    canCancel: ["PENDING", "CONFIRMED"].includes(booking.status),
  };
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

  if (action === "confirm" && booking.status !== "PENDING") {
    throw new Error("BOOKING_ACTION_NOT_ALLOWED");
  }

  if (action === "cancel" && !["PENDING", "CONFIRMED"].includes(booking.status)) {
    throw new Error("BOOKING_ACTION_NOT_ALLOWED");
  }

  const updated = await db.booking.update({
    where: { id: booking.id },
    data: {
      status: action === "confirm" ? "CONFIRMED" : "CANCELLED",
    },
    include: {
      business: true,
      service: true,
      staffMember: true,
    },
  });

  await sendBookingNotification(updated.id, action === "confirm" ? "BOOKING_CONFIRMED" : "BOOKING_CANCELLED");

  return {
    id: updated.id,
    publicToken: updated.publicToken ?? "",
    status: updated.status,
    startsAt: updated.startsAt,
    endsAt: updated.endsAt,
    customerName: updated.customerName,
    customerEmail: updated.customerEmail,
    customerPhone: updated.customerPhone,
    serviceName: updated.service.name,
    staffName: updated.staffMember?.fullName ?? null,
    businessName: updated.business.name,
    businessSlug: updated.business.slug,
    canConfirm: updated.status === "PENDING",
    canCancel: ["PENDING", "CONFIRMED"].includes(updated.status),
  };
}

export async function getDashboardSnapshot() {
  const business = await getCurrentBusiness();

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
    city: business.locations[0]?.city ?? "Lisboa",
    bookingsCount: business.bookings.length,
    recentBookings,
  };
}

export async function getBookingAgenda(input?: { date?: string; staffMemberId?: string }): Promise<BookingAgendaSnapshot> {
  const business = await getCurrentBusiness();
  const requestedDate = input?.date ? new Date(`${input.date}T00:00:00`) : new Date();
  const safeDate = Number.isNaN(requestedDate.getTime()) ? new Date() : requestedDate;
  const dayStart = set(safeDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
  const dayEnd = set(safeDate, { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 });

  const bookings = await db.booking.findMany({
    where: {
      businessId: business.id,
      startsAt: {
        gte: dayStart,
        lte: dayEnd,
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
        gte: dayStart,
        lte: dayEnd,
      },
      ...(input?.staffMemberId ? { OR: [{ staffMemberId: input.staffMemberId }, { staffMemberId: null }] } : {}),
    },
    include: {
      staffMember: true,
    },
    orderBy: { startsAt: "asc" },
  });

  return {
    date: format(dayStart, "yyyy-MM-dd"),
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
    bookings: bookings.map((booking) => ({
      id: booking.id,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      status: booking.status,
      source: booking.source,
      priceCents: booking.priceCents,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      serviceName: booking.service.name,
      staffName: booking.staffMember?.fullName ?? "Sem profissional",
    })),
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

  const blocked = await db.scheduleBlock.findFirst({
    where: {
      businessId: business.id,
      OR: [{ staffMemberId: staffMember.id }, { staffMemberId: null }],
      startsAt: {
        lt: endsAt,
      },
      endsAt: {
        gt: startsAt,
      },
    },
  });

  if (blocked) {
    throw new Error("HORARIO_BLOQUEADO");
  }

  const identity = `${business.id}:${input.customerEmail?.toLowerCase() ?? input.customerPhone ?? input.customerName}`;
  const customer = await db.customer.upsert({
    where: { id: identity },
    update: {
      fullName: input.customerName,
      email: input.customerEmail,
      phone: input.customerPhone,
      lastBookedAt: startsAt,
    },
    create: {
      id: identity,
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
      status: input.status ?? "CONFIRMED",
      source: "MANUAL",
      paymentStatus: "UNPAID",
      publicToken: crypto.randomUUID(),
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

export async function getManagementSnapshot(): Promise<ManagementSnapshot> {
  const business = await getCurrentBusiness();

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

export async function getCustomersSnapshot(): Promise<CustomerSnapshot> {
  const business = await getCurrentBusiness();

  const customers = await db.customer.findMany({
    where: { businessId: business.id },
    include: {
      bookings: {
        include: {
          service: true,
        },
        orderBy: { startsAt: "desc" },
      },
    },
    orderBy: [{ lastBookedAt: "desc" }, { createdAt: "desc" }],
  });

  return {
    customers: customers.map((customer) => ({
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      notes: customer.notes,
      marketingOptIn: customer.marketingOptIn,
      lastBookedAt: customer.lastBookedAt,
      totalBookings: customer.bookings.length,
      totalSpentCents: customer.bookings
        .filter((booking) => !["CANCELLED", "NO_SHOW"].includes(booking.status))
        .reduce((sum, booking) => sum + booking.priceCents, 0),
      lastServiceName: customer.bookings[0]?.service.name ?? null,
    })),
  };
}

export async function createService(input: {
  name: string;
  description?: string;
  durationMinutes: number;
  priceCents: number;
}) {
  const business = await getCurrentBusiness();

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
  const business = await getCurrentBusiness();
  const service = await db.service.findFirst({
    where: { id, businessId: business.id },
  });

  if (!service) {
    throw new Error("SERVICE_NOT_FOUND");
  }

  return db.service.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description || null,
      durationMinutes: input.durationMinutes,
      priceCents: input.priceCents,
      isActive: input.isActive,
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
  const business = await getCurrentBusiness();
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
  const business = await getCurrentBusiness();
  const staffExists = await db.staffMember.findFirst({
    where: { id, businessId: business.id },
  });

  if (!staffExists) {
    throw new Error("STAFF_NOT_FOUND");
  }

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
    await sendBookingNotification(updated.id, "BOOKING_CANCELLED");
  }

  return updated;
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

  return db.customer.update({
    where: { id },
    data: {
      fullName: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
      notes: input.notes || null,
      marketingOptIn: input.marketingOptIn,
    },
  });
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
