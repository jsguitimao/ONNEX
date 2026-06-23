import type { PublicBusinessPayload } from "@/lib/business";
import { inferMediaKindFromUrl, isSupportedMediaUrl } from "@/lib/media-url";
import type { PublicPageMedia, PublicPageViewModel } from "@/lib/public-page/types";

function buildHero(business: PublicBusinessPayload): PublicPageMedia | null {
  const heroUrl = [business.heroImageUrl, business.coverImageUrl, business.logoUrl].find(
    (url): url is string => Boolean(url && isSupportedMediaUrl(url)),
  );

  if (!heroUrl) return null;

  const kind = inferMediaKindFromUrl(heroUrl);
  if (!kind) return null;

  const posterUrl = [business.coverImageUrl, business.logoUrl].find(
    (url): url is string => Boolean(url && url !== heroUrl && isSupportedMediaUrl(url)),
  );

  return {
    kind,
    url: heroUrl,
    posterUrl: posterUrl ?? null,
  };
}

export function fromPublicBusiness(business: PublicBusinessPayload): PublicPageViewModel {
  const locationLine1 = business.mapsAddress?.split(",")[0]?.trim() || null;

  return {
    name: business.name,
    slug: business.slug,
    theme: business.theme,
    description: business.description,
    headline: business.headline,
    hero: buildHero(business),
    socials: {
      phoneDigits: (business.phone ?? "").replace(/\D/g, ""),
      instagramUrl: business.instagramUrl,
      tiktokUrl: business.tiktokUrl,
      facebookUrl: business.facebookUrl,
    },
    onlineBooking: business.onlineBooking,
    showTeam: business.showTeam,
    showPrices: business.showPrices,
    showDurations: business.showDurations,
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
      avatarUrl: member.avatarUrl,
      portfolioImages: member.portfolioImages.filter(isSupportedMediaUrl),
      serviceIds: member.serviceIds,
    })),
    galleryImages: business.galleryImages.filter(isSupportedMediaUrl),
    mapsAddress: business.mapsAddress,
    locationLine1,
    locationCity: business.city,
  };
}
