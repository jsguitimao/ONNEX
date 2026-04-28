// Modelo do "draft" do editor de página: o que vai no postMessage e no save.
// Mantém-se compatível com PublicBusinessPayload para o renderer ser comum.

export type EditorMediaKind = "image" | "video";

export type EditorHeroMedia = {
  kind: EditorMediaKind;
  url: string;
  posterUrl: string | null;
};

export type EditorService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
};

export type EditorStaff = {
  id: string;
  fullName: string;
  roleTitle: string | null;
  bio: string | null;
  avatarUrl: string | null;
  portfolioImages: string[];
  serviceIds: string[];
};

export type EditorDraft = {
  // Identidade
  name: string;
  slug: string;
  city: string;
  headline: string;
  description: string;

  // Hero (vídeo ou imagem 1:1)
  hero: EditorHeroMedia | null;

  // Sociais
  phone: string;
  whatsappEnabled: boolean;
  instagramUrl: string;
  tiktokUrl: string;
  facebookUrl: string;

  // Localização
  mapsAddress: string;

  // SEO
  seoTitle: string;
  seoDescription: string;

  // Listas (read-only neste scaffold)
  services: EditorService[];
  staffMembers: EditorStaff[];
  galleryImages: string[];
};

export const POSTMESSAGE_TYPE = "bukly:editor-draft" as const;

export type EditorPostMessage = {
  type: typeof POSTMESSAGE_TYPE;
  payload: EditorDraft;
};
