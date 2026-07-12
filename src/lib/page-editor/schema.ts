import { z } from "zod";
import { inferMediaKindFromUrl, isSupportedMediaUrl } from "@/lib/media-url";

const optionalString = (max: number) =>
  z.preprocess(
    (v) => (v == null ? undefined : typeof v === "string" ? v.trim() : v),
    z.string().max(max).optional().default(""),
  );

const optionalUrl = (max = 200) =>
  z.preprocess(
    (v) => (v == null ? undefined : typeof v === "string" ? v.trim() : v),
    z
      .string()
      .max(max)
      .refine((v) => v === "" || /^https?:\/\//i.test(v), {
        message: "URL inválido",
      })
      .optional()
      .default(""),
  );

const heroSchema = z
  .object({
    kind: z.enum(["image", "video"]),
    url: z.string().url().max(500),
    posterUrl: z.string().url().max(500).nullable(),
  })
  .refine((hero) => inferMediaKindFromUrl(hero.url) === hero.kind, {
    message: "O hero deve apontar diretamente para uma imagem ou vídeo suportado.",
    path: ["url"],
  })
  .nullable();

const serviceSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(50),
  description: z.string().trim().max(120).nullable(),
  durationMinutes: z.number().int().min(5).max(240),
  priceCents: z.number().int().min(0).max(1_000_000),
});

const staffSchema = z.object({
  id: z.string().min(1).max(40),
  fullName: z.string().trim().min(1).max(40),
  roleTitle: z.string().trim().max(30).nullable(),
  bio: z.string().trim().max(200).nullable(),
  avatarUrl: z.string().url().max(500).refine(isSupportedMediaUrl, "Imagem inválida").nullable(),
  portfolioImages: z.array(z.string().url().max(500).refine(isSupportedMediaUrl, "Imagem inválida")).max(20).default([]),
  serviceIds: z.array(z.string().min(1).max(40)).default([]),
});

export const editorDraftSchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Apenas minúsculas, números e hífen"),
  headline: optionalString(80),
  description: optionalString(280),

  theme: z.enum(["dark", "light"]).default("dark"),
  onlineBooking: z.boolean().default(true),
  showTeam: z.boolean().default(true),
  showPrices: z.boolean().default(true),
  showDurations: z.boolean().default(true),

  hero: heroSchema,

  phone: optionalString(30),
  whatsappEnabled: z.boolean(),
  instagramUrl: optionalUrl(),
  tiktokUrl: optionalUrl(),
  facebookUrl: optionalUrl(),

  mapsAddress: optionalString(200),

  seoTitle: optionalString(70),
  seoDescription: optionalString(160),

  services: z.array(serviceSchema).max(50),
  staffMembers: z.array(staffSchema).max(30),
  galleryImages: z.array(z.string().url().max(500).refine(isSupportedMediaUrl, "Imagem inválida")).max(20).default([]),
});

export type ValidatedDraft = z.infer<typeof editorDraftSchema>;

// Traduz o 1º erro de validação do editor numa mensagem CLARA em português,
// identificando a secção/campo. Substitui a mensagem técnica em inglês do Zod
// (ex.: "Too small: expected string to have >=1 characters"), que enganava o
// dono — parecia ser o link do Facebook quando na verdade era um serviço ou
// profissional SEM NOME a bloquear o guardar.
export function describeEditorDraftError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Dados inválidos.";
  const top = String(issue.path[0] ?? "");
  const sub = String(issue.path[2] ?? "");

  if (top === "name") return "O nome da barbearia não pode ficar vazio.";
  if (top === "slug")
    return "O link da página só pode ter minúsculas, números e hífen (mínimo 2 caracteres).";
  if (top === "services") {
    if (sub === "name")
      return "Há um serviço sem nome. Vai à secção Serviços e preenche o nome — ou remove esse serviço — antes de guardar.";
    if (sub === "priceCents") return "Há um serviço com um preço inválido. Verifica a secção Serviços.";
    if (sub === "durationMinutes") return "Há um serviço com uma duração inválida. Verifica a secção Serviços.";
    return "Há um serviço com dados incompletos. Verifica a secção Serviços.";
  }
  if (top === "staffMembers") {
    if (sub === "fullName")
      return "Há um profissional sem nome. Vai à secção Equipa e preenche o nome — ou remove esse profissional — antes de guardar.";
    return "Há um profissional com dados incompletos. Verifica a secção Equipa.";
  }
  if (top === "instagramUrl") return "O link do Instagram é inválido. Deve começar por https://";
  if (top === "tiktokUrl") return "O link do TikTok é inválido. Deve começar por https://";
  if (top === "facebookUrl") return "O link do Facebook é inválido. Deve começar por https://";
  if (["headline", "description", "seoTitle", "seoDescription", "mapsAddress"].includes(top))
    return "Um dos textos ultrapassa o limite de caracteres permitido.";

  return issue.message || "Alguns campos estão incompletos. Verifica os Serviços, a Equipa e os links.";
}
