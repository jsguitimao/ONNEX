import { getBookingPolicySettings } from "@/lib/booking-policy";
import { db } from "@/lib/db";
import { demoBusiness } from "@/lib/demo-data";
import { getCurrentBusiness } from "./core";
import type { OnboardingDraft } from "./types";

export async function getBusinessForOnboarding() {
  const business = await getCurrentBusiness();
  const location = business.locations[0];
  const policy = getBookingPolicySettings(business);

  return {
    businessName: business.name,
    slug: business.slug,
    city: location?.city ?? "Lisboa",
    phone: business.contactPhone ?? "",
    contactEmail: business.contactEmail ?? "",
    websiteUrl: business.websiteUrl ?? "",
    description: business.description ?? "",
    headline: business.bookingPage?.headline ?? demoBusiness.headline,
    subheadline: business.bookingPage?.subheadline ?? demoBusiness.subheadline,
    welcomeMessage: business.bookingPage?.welcomeMessage ?? demoBusiness.welcomeMessage,
    primaryColor: business.primaryColor ?? demoBusiness.primaryColor,
    accentColor: business.accentColor ?? demoBusiness.accentColor,
    logoUrl: business.logoUrl ?? "",
    coverImageUrl: business.coverImageUrl ?? "",
    heroImageUrl: business.bookingPage?.heroImageUrl ?? "",
    aboutImages: (business.bookingPage?.aboutImages as string[] | null) ??
      (business.bookingPage?.aboutImageUrl ? [business.bookingPage.aboutImageUrl] : []),
    servicesImages: (business.bookingPage?.servicesImages as string[] | null) ??
      (business.bookingPage?.servicesImageUrl ? [business.bookingPage.servicesImageUrl] : []),
    teamImages: (business.bookingPage?.teamImages as string[] | null) ??
      (business.bookingPage?.teamImageUrl ? [business.bookingPage.teamImageUrl] : []),
    onlineBooking: business.onlineBooking,
    sobreColor: business.bookingPage?.sobreColor ?? "",
    servicosColor: business.bookingPage?.servicosColor ?? "",
    equipaColor: business.bookingPage?.equipaColor ?? "",
    localizacaoColor: business.bookingPage?.localizacaoColor ?? "",
    reservaColor: business.bookingPage?.reservaColor ?? "",
    heroTagline: business.bookingPage?.heroTagline ?? "",
    textColor: business.bookingPage?.textColor ?? "",
    showTeam: business.bookingPage?.showTeam ?? true,
    showPrices: business.bookingPage?.showPrices ?? true,
    showDurations: business.bookingPage?.showDurations ?? true,
    bookingLeadTimeHours: policy.bookingLeadTimeHours,
    bookingWindowDays: policy.bookingWindowDays,
    slotIntervalMinutes: policy.slotIntervalMinutes,
    cancellationWindowHours: policy.cancellationWindowHours,
  } satisfies OnboardingDraft;
}

export async function updateBusinessFromOnboarding(input: OnboardingDraft) {
  const business = await getCurrentBusiness();

  if (input.slug !== business.slug) {
    const existing = await db.business.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });

    if (existing && existing.id !== business.id) {
      throw new Error("SLUG_ALREADY_TAKEN");
    }
  }

  return db.business.update({
    where: { id: business.id },
    data: {
      name: input.businessName,
      slug: input.slug,
      description: input.description || null,
      contactPhone: input.phone || null,
      contactEmail: input.contactEmail || null,
      websiteUrl: input.websiteUrl || null,
      primaryColor: input.primaryColor,
      accentColor: input.accentColor,
      logoUrl: input.logoUrl || null,
      coverImageUrl: input.coverImageUrl || null,
      onlineBooking: input.onlineBooking,
      bookingLeadTimeHours: input.bookingLeadTimeHours,
      bookingWindowDays: input.bookingWindowDays,
      slotIntervalMinutes: input.slotIntervalMinutes,
      cancellationWindowHours: input.cancellationWindowHours,
      bookingPage: {
        upsert: {
          create: {
            headline: input.headline,
            subheadline: input.subheadline,
            welcomeMessage: input.welcomeMessage,
            heroImageUrl: input.heroImageUrl || null,
            aboutImageUrl: input.aboutImages[0] ?? null,
            servicesImageUrl: input.servicesImages[0] ?? null,
            teamImageUrl: input.teamImages[0] ?? null,
            aboutImages: input.aboutImages,
            servicesImages: input.servicesImages,
            teamImages: input.teamImages,
            sobreColor: input.sobreColor || null,
            servicosColor: input.servicosColor || null,
            equipaColor: input.equipaColor || null,
            localizacaoColor: input.localizacaoColor || null,
            reservaColor: input.reservaColor || null,
            heroTagline: input.heroTagline || null,
            textColor: input.textColor || null,
            showTeam: input.showTeam,
            showPrices: input.showPrices,
            showDurations: input.showDurations,
          },
          update: {
            headline: input.headline,
            subheadline: input.subheadline,
            welcomeMessage: input.welcomeMessage,
            heroImageUrl: input.heroImageUrl || null,
            aboutImageUrl: input.aboutImages[0] ?? null,
            servicesImageUrl: input.servicesImages[0] ?? null,
            teamImageUrl: input.teamImages[0] ?? null,
            aboutImages: input.aboutImages,
            servicesImages: input.servicesImages,
            teamImages: input.teamImages,
            sobreColor: input.sobreColor || null,
            servicosColor: input.servicosColor || null,
            equipaColor: input.equipaColor || null,
            localizacaoColor: input.localizacaoColor || null,
            reservaColor: input.reservaColor || null,
            heroTagline: input.heroTagline || null,
            textColor: input.textColor || null,
            showTeam: input.showTeam,
            showPrices: input.showPrices,
            showDurations: input.showDurations,
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
