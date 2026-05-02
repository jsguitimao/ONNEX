import { z } from "zod";

const optionalString = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().max(max).optional().default(""),
  );

const optionalUrl = (max = 200) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
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
  avatarUrl: z.string().url().max(500).nullable(),
  portfolioImages: z.array(z.string().url().max(500)).max(20).default([]),
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
  city: optionalString(40),
  headline: optionalString(80),
  description: optionalString(280),

  theme: z.enum(["dark", "light"]).default("dark"),

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
  galleryImages: z.array(z.string().url().max(500)).max(20).default([]),
});

export type ValidatedDraft = z.infer<typeof editorDraftSchema>;
