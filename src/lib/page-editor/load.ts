import { getCurrentBusiness } from "@/lib/business-modules/core";
import { inferMediaKindFromUrl, isSupportedMediaUrl } from "@/lib/media-url";
import type { EditorDraft, EditorHeroMedia } from "@/lib/page-editor/draft";

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is string => typeof value === "string");
}

export async function loadEditorDraft(): Promise<EditorDraft> {
  const business = await getCurrentBusiness();

  const page = business.bookingPage;
  const location = business.locations[0];

  const heroKind = page?.heroImageUrl ? inferMediaKindFromUrl(page.heroImageUrl) : null;
  const hero: EditorHeroMedia | null = page?.heroImageUrl && heroKind
    ? {
        kind: heroKind,
        url: page.heroImageUrl,
        posterUrl: page.heroPosterUrl ?? null,
      }
    : null;

  const mapsAddress =
    page?.mapsAddress ??
    [
      location?.addressLine1,
      location?.addressLine2,
      location?.postalCode,
      location?.city,
    ]
      .filter(Boolean)
      .join(", ");

  return {
    name: business.name,
    slug: business.slug,
    headline: page?.headline ?? "",
    description: business.description ?? "",

    theme: page?.theme === "light" ? "light" : "dark",
    onlineBooking: business.onlineBooking,
    showTeam: page?.showTeam ?? true,
    showPrices: page?.showPrices ?? true,
    showDurations: page?.showDurations ?? true,

    hero,

    phone: business.contactPhone ?? "",
    whatsappEnabled: page?.whatsappEnabled ?? Boolean(business.contactPhone),
    instagramUrl: business.instagramUrl ?? "",
    tiktokUrl: business.tiktokUrl ?? "",
    facebookUrl: business.facebookUrl ?? "",

    mapsAddress: mapsAddress ?? "",

    seoTitle: page?.seoTitle ?? "",
    seoDescription: page?.seoDescription ?? "",

    services: business.services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
    })),
    staffMembers: business.staffMembers.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      roleTitle: m.roleTitle,
      bio: m.bio,
      avatarUrl: m.avatarUrl,
      portfolioImages: asStringArray(m.portfolioImages).filter(isSupportedMediaUrl),
      serviceIds: m.services.map((s) => s.serviceId),
    })),
    galleryImages: asStringArray(page?.galleryImages).filter(isSupportedMediaUrl),
  };
}
