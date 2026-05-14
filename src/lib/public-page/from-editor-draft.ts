import { isSupportedMediaUrl } from "@/lib/media-url";
import type { EditorDraft } from "@/lib/page-editor/draft";
import type { PublicPageViewModel } from "@/lib/public-page/types";

export function fromEditorDraft(draft: EditorDraft): PublicPageViewModel {
  return {
    name: draft.name,
    slug: draft.slug,
    theme: draft.theme === "light" ? "light" : "dark",
    description: draft.description || null,
    headline: draft.headline || null,
    hero: draft.hero && isSupportedMediaUrl(draft.hero.url)
      ? {
          kind: draft.hero.kind,
          url: draft.hero.url,
          posterUrl: draft.hero.posterUrl && isSupportedMediaUrl(draft.hero.posterUrl)
            ? draft.hero.posterUrl
            : null,
        }
      : null,
    socials: {
      phoneDigits: draft.whatsappEnabled ? draft.phone.replace(/\D/g, "") : "",
      instagramUrl: draft.instagramUrl || null,
      tiktokUrl: draft.tiktokUrl || null,
      facebookUrl: draft.facebookUrl || null,
    },
    onlineBooking: draft.onlineBooking,
    showTeam: draft.showTeam,
    showPrices: draft.showPrices,
    showDurations: draft.showDurations,
    services: draft.services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
    })),
    staffMembers: draft.staffMembers.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      roleTitle: member.roleTitle,
      bio: member.bio,
      avatarUrl: member.avatarUrl,
      portfolioImages: member.portfolioImages.filter(isSupportedMediaUrl),
      serviceIds: member.serviceIds,
    })),
    galleryImages: draft.galleryImages.filter(isSupportedMediaUrl),
    mapsAddress: draft.mapsAddress || null,
    locationLine1: draft.mapsAddress || null,
    locationCity: draft.city || null,
  };
}
