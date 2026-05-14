export type PublicPageMedia = {
  kind: "image" | "video";
  url: string;
  posterUrl: string | null;
};

export type PublicPageService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
};

export type PublicPageStaffMember = {
  id: string;
  fullName: string;
  roleTitle: string | null;
  bio: string | null;
  avatarUrl: string | null;
  portfolioImages: string[];
  serviceIds: string[];
};

export type PublicPageViewModel = {
  name: string;
  slug: string;
  theme: "dark" | "light";
  description: string | null;
  headline: string | null;
  hero: PublicPageMedia | null;
  socials: {
    phoneDigits: string;
    instagramUrl: string | null;
    tiktokUrl: string | null;
    facebookUrl: string | null;
  };
  onlineBooking: boolean;
  showTeam: boolean;
  showPrices: boolean;
  showDurations: boolean;
  services: PublicPageService[];
  staffMembers: PublicPageStaffMember[];
  galleryImages: string[];
  mapsAddress: string | null;
  locationLine1: string | null;
  locationCity: string | null;
};
