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
    instagramUrl: business.instagramUrl ?? "",
    tiktokUrl: business.tiktokUrl ?? "",
    facebookUrl: business.facebookUrl ?? "",
    description: business.description ?? "",
    headline: business.bookingPage?.headline ?? demoBusiness.headline,
    primaryColor: business.primaryColor ?? demoBusiness.primaryColor,
    accentColor: business.accentColor ?? demoBusiness.accentColor,
    logoUrl: business.logoUrl ?? "",
    coverImageUrl: business.coverImageUrl ?? "",
    heroImageUrl: business.bookingPage?.heroImageUrl ?? "",
    onlineBooking: business.onlineBooking,
    theme: business.bookingPage?.theme === "light" ? "light" : "dark",
    showTeam: business.bookingPage?.showTeam ?? true,
    showPrices: business.bookingPage?.showPrices ?? true,
    showDurations: business.bookingPage?.showDurations ?? true,
    bookingLeadTimeHours: policy.bookingLeadTimeHours,
    bookingWindowDays: policy.bookingWindowDays,
    slotIntervalMinutes: policy.slotIntervalMinutes,
    cancellationWindowHours: policy.cancellationWindowHours,
    seoTitle: business.bookingPage?.seoTitle ?? "",
    seoDescription: business.bookingPage?.seoDescription ?? "",
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

  const bookingPageData = {
    headline: input.headline,
    heroImageUrl: input.heroImageUrl || null,
    theme: input.theme,
    showTeam: input.showTeam,
    showPrices: input.showPrices,
    showDurations: input.showDurations,
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
  } as const;

  return db.business.update({
    where: { id: business.id },
    data: {
      name: input.businessName,
      slug: input.slug,
      description: input.description || null,
      contactPhone: input.phone || null,
      instagramUrl: input.instagramUrl || null,
      tiktokUrl: input.tiktokUrl || null,
      facebookUrl: input.facebookUrl || null,
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
          create: bookingPageData,
          update: bookingPageData,
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
