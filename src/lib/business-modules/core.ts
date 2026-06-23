import { auth, currentUser } from "@clerk/nextjs/server";
import { addDays, set } from "date-fns";
import { cache } from "react";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { demoBusiness } from "@/lib/demo-data";

const DEMO_OWNER = {
  clerkUserId: "local-demo-owner",
  email: "owner@onnex.local",
  firstName: "Guilherme",
  lastName: "Owner",
};

import { DEFAULT_AVAILABILITY } from "./types";

const currentBusinessInclude = {
  bookingPage: true,
  services: {
    where: { deletedAt: null },
    orderBy: { displayOrder: "asc" },
  },
  staffMembers: {
    where: { deletedAt: null },
    orderBy: { displayOrder: "asc" },
    include: {
      services: true,
      availabilities: true,
    },
  },
  locations: { where: { isDefault: true }, take: 1 },
} as const;

// Include usado pelo hydrateOperationalData. Exportado como tipo para podermos
// passar a barbearia já carregada (ex.: acabada de criar) e evitar uma re-leitura
// à BD no caminho de provisionamento de conta nova.
const operationalHydrationInclude = {
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
} satisfies Prisma.BusinessInclude;

type OperationalBusiness = Prisma.BusinessGetPayload<{
  include: typeof operationalHydrationInclude;
}>;

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

function getInternalUserEmailFallback(clerkUserId: string) {
  const safeLocalPart = clerkUserId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${safeLocalPart || "user"}@users.onnex.local`;
}

function buildDemoStaffBio(specialties: string[]) {
  return specialties.join(" / ");
}

async function syncCurrentUserProfile(input: {
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}) {
  const existingUser = await db.user.findUnique({
    where: { clerkUserId: input.clerkUserId },
  });

  if (!existingUser) {
    return db.user.create({
      data: input,
    });
  }

  const hasChanges =
    existingUser.email !== input.email ||
    existingUser.firstName !== input.firstName ||
    existingUser.lastName !== input.lastName ||
    existingUser.avatarUrl !== input.avatarUrl;

  if (!hasChanges) {
    return existingUser;
  }

  return db.user.update({
    where: { id: existingUser.id },
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      avatarUrl: input.avatarUrl,
    },
  });
}

function needsOperationalHydration(business: {
  locations: Array<{ id: string }>;
  staffMembers: Array<{
    locationId: string | null;
    services: unknown[];
    availabilities: unknown[];
  }>;
}): boolean {
  const defaultLocation = business.locations[0];

  return business.staffMembers.some(
    (member) =>
      Boolean(defaultLocation && !member.locationId) ||
      member.services.length === 0 ||
      member.availabilities.length === 0
  );
}

async function fetchCurrentBusiness() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("AUTH_REQUIRED");
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("AUTH_REQUIRED");
  }

  const primaryEmail = getPrimaryEmailAddress(clerkUser);
  const email = primaryEmail || getInternalUserEmailFallback(userId);

  const appUser = await syncCurrentUserProfile({
    clerkUserId: userId,
    email,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    avatarUrl: clerkUser.imageUrl,
  });

  const existingBusiness = await db.business.findFirst({
    where: { ownerId: appUser.id },
    orderBy: { createdAt: "asc" },
    include: currentBusinessInclude,
  });

  if (existingBusiness) {
    if (!needsOperationalHydration(existingBusiness)) {
      return existingBusiness;
    }

    await hydrateOperationalData(existingBusiness.id, { seedBooking: false });
    return db.business.findUniqueOrThrow({
      where: { id: existingBusiness.id },
      include: currentBusinessInclude,
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
      primaryColor: demoBusiness.primaryColor,
      accentColor: demoBusiness.accentColor,
      bookingPage: {
        create: {
          headline: demoBusiness.headline,
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
          bio: "Responsável pelo atendimento e pela experiência do negócio.",
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
    include: operationalHydrationInclude,
  });

  await hydrateOperationalData(createdBusiness.id, {
    seedBooking: false,
    preloaded: createdBusiness,
  });

  return db.business.findUniqueOrThrow({
    where: { id: createdBusiness.id },
    include: currentBusinessInclude,
  });
}

export const getCurrentBusiness = cache(fetchCurrentBusiness);

async function ensureDemoBusinessInternal() {
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

  let demoBusinessId = existingBusiness?.id;

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

    demoBusinessId = created.id;
    await hydrateOperationalData(created.id);
  } else if (needsOperationalHydration(existingBusiness)) {
    await hydrateOperationalData(existingBusiness.id);
  }

  if (!demoBusinessId) {
    throw new Error("DEMO_BUSINESS_NOT_FOUND");
  }

  await Promise.all(
    demoBusiness.team.map((member) =>
      db.staffMember.updateMany({
        where: {
          businessId: demoBusinessId,
          slug: member.id,
        },
        data: {
          bio: buildDemoStaffBio(member.specialties),
        },
      })
    )
  );

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

export const ensureDemoBusiness = cache(ensureDemoBusinessInternal);

export async function hydrateOperationalData(
  businessId: string,
  options: {
    seedBooking?: boolean;
    /** Barbearia já carregada (com operationalHydrationInclude) para poupar uma re-leitura. */
    preloaded?: OperationalBusiness;
  } = {}
) {
  const business =
    options.preloaded ??
    (await db.business.findUniqueOrThrow({
      where: { id: businessId },
      include: operationalHydrationInclude,
    }));

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
        customerEmail: "cliente.demo@onnex.local",
        customerPhone: "+351 910 000 000",
      },
    });
  }
}

const publicBusinessInclude = {
  bookingPage: true,
  services: {
    where: { isActive: true, deletedAt: null },
    orderBy: { displayOrder: "asc" },
  },
  staffMembers: {
    where: { isActive: true, deletedAt: null },
    orderBy: { displayOrder: "asc" },
    include: {
      services: true,
    },
  },
  locations: {
    where: { isDefault: true },
    take: 1,
  },
  subscription: true,
} as const;

async function fetchBusinessBySlug(slug: string) {
  let business = await db.business.findUnique({
    where: { slug },
    include: publicBusinessInclude,
  });

  if (!business && slug === demoBusiness.slug) {
    await ensureDemoBusiness();
    business = await db.business.findUnique({
      where: { slug },
      include: publicBusinessInclude,
    });
  }

  if (!business) return null;

  return business;
}

export const getBusinessBySlug = cache(fetchBusinessBySlug);

export async function replaceStaffAvailability(
  staffMemberId: string,
  availability: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
) {
  await db.$transaction(async (tx) => {
    await tx.weeklyAvailability.deleteMany({
      where: { staffMemberId },
    });

    if (availability.length > 0) {
      await tx.weeklyAvailability.createMany({
        data: availability.map((slot) => ({
          staffMemberId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      });
    }
  });
}

