import { mockBusiness } from "@/lib/mock-business";
import type { EditorDraft } from "@/lib/page-editor/draft";

export function buildInitialDraftFromMock(): EditorDraft {
  const heroUrl = mockBusiness.heroImageUrl ?? mockBusiness.coverImageUrl;
  const portfolio = Array.from(
    new Set(mockBusiness.staffMembers.flatMap((m) => m.portfolioImages)),
  );

  return {
    name: mockBusiness.name,
    slug: mockBusiness.slug,
    city: mockBusiness.city,
    headline: mockBusiness.headline ?? "",
    description: mockBusiness.description ?? "",

    hero: heroUrl ? { kind: "image", url: heroUrl, posterUrl: null } : null,

    phone: mockBusiness.phone ?? "",
    whatsappEnabled: Boolean(mockBusiness.phone),
    instagramUrl: mockBusiness.instagramUrl ?? "",
    tiktokUrl: mockBusiness.tiktokUrl ?? "",
    facebookUrl: mockBusiness.facebookUrl ?? "",

    mapsAddress: mockBusiness.mapsAddress ?? "",

    seoTitle: "",
    seoDescription: "",

    services: mockBusiness.services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
    })),
    staffMembers: mockBusiness.staffMembers.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      roleTitle: m.roleTitle,
      bio: m.bio,
      avatarUrl: m.avatarUrl,
      portfolioImages: m.portfolioImages,
      serviceIds: m.serviceIds,
    })),
    galleryImages: portfolio,
  };
}
