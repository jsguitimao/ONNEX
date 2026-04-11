import { db } from "@/lib/db";
import { demoBusiness } from "@/lib/demo-data";

const DEMO_OWNER = {
  clerkUserId: "local-demo-owner",
  email: "owner@bukly.local",
  firstName: "Guilherme",
  lastName: "Owner",
};

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

export async function ensureDemoBusiness() {
  const owner = await db.user.upsert({
    where: { clerkUserId: DEMO_OWNER.clerkUserId },
    update: {},
    create: DEMO_OWNER,
  });

  const business = await db.business.upsert({
    where: { slug: demoBusiness.slug },
    update: {},
    create: {
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
      staffMembers: { orderBy: { displayOrder: "asc" } },
      locations: { where: { isDefault: true }, take: 1 },
    },
  });

  if (business.services.length === 0) {
    await db.service.createMany({
      data: demoBusiness.services.map((service, index) => ({
        businessId: business.id,
        name: service.name,
        slug: service.id,
        description: service.description,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
        displayOrder: index,
      })),
    });
  }

  if (business.staffMembers.length === 0) {
    await db.staffMember.createMany({
      data: demoBusiness.team.map((member, index) => ({
        businessId: business.id,
        fullName: member.name,
        slug: member.id,
        roleTitle: member.role,
        bio: member.specialties.join(" · "),
        displayOrder: index,
      })),
    });
  }

  return db.business.findUniqueOrThrow({
    where: { id: business.id },
    include: {
      bookingPage: true,
      services: { orderBy: { displayOrder: "asc" } },
      staffMembers: { orderBy: { displayOrder: "asc" } },
      locations: { where: { isDefault: true }, take: 1 },
    },
  });
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

  const updated = await db.business.update({
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
              data: { city: input.city, name: `${input.businessName} ${input.city}`.trim() },
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
    include: {
      bookingPage: true,
      services: { orderBy: { displayOrder: "asc" } },
      staffMembers: { orderBy: { displayOrder: "asc" } },
      locations: { where: { isDefault: true }, take: 1 },
    },
  });

  return updated;
}

export async function getBusinessBySlug(slug: string) {
  await ensureDemoBusiness();

  return db.business.findUnique({
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
}

export async function getDashboardSnapshot() {
  const business = await ensureDemoBusiness();

  return {
    businessName: business.name,
    slug: business.slug,
    servicesCount: business.services.length,
    staffCount: business.staffMembers.length,
    monthlyRevenueCents: business.services.reduce((sum, service) => sum + service.priceCents, 0),
    city: business.locations[0]?.city ?? demoBusiness.city,
  };
}
