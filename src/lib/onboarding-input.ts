import { z } from "zod";
import type { OnboardingDraft } from "./business-modules/types";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

function ensureString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function normalizeOptionalEmailInput(value: unknown) {
  const normalized = normalizeOptionalString(value);

  if (typeof normalized !== "string" || normalized.length === 0) {
    return normalized;
  }

  return normalized.toLowerCase();
}

export function normalizeOptionalUrlInput(value: unknown) {
  const normalized = normalizeOptionalString(value);

  if (typeof normalized !== "string" || normalized.length === 0) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:[/?#].*)?$/i.test(normalized)) {
    return `https://${normalized}`;
  }

  return normalized;
}

export function normalizeSlugInput(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

function normalizeHexColorInput(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().toUpperCase();
}

const optionalEmailSchema = z.preprocess(
  normalizeOptionalEmailInput,
  z.string().email("Use um email valido.").or(z.literal("")),
);

const optionalPhoneSchema = z.preprocess(
  normalizeOptionalString,
  z
    .string()
    .max(30)
    .refine((value) => value === "" || value.length >= 6, "Use um telefone valido."),
);

const optionalUrlSchema = z.preprocess(
  normalizeOptionalUrlInput,
  z.string().url("Use um URL valido, por exemplo https://site.com.").or(z.literal("")),
);

const hexColorSchema = z.preprocess(
  normalizeHexColorInput,
  z.string().regex(/^#([0-9A-F]{6})$/, "Use uma cor hexadecimal valida, como #111827."),
);

export const onboardingSchema = z.object({
  businessName: z.preprocess(normalizeString, z.string().min(2).max(100)),
  slug: z.preprocess(
    normalizeSlugInput,
    z.string().min(3).max(60).regex(/^[a-z0-9-]+$/, "Use apenas letras minusculas, numeros e hifen no slug."),
  ),
  city: z.preprocess(normalizeString, z.string().min(2).max(80)),
  phone: optionalPhoneSchema,
  contactEmail: optionalEmailSchema,
  websiteUrl: optionalUrlSchema,
  instagramUrl: optionalUrlSchema,
  description: z.preprocess(normalizeOptionalString, z.string().max(500)),
  headline: z.preprocess(normalizeOptionalString, z.string().max(140)),
  primaryColor: hexColorSchema,
  accentColor: hexColorSchema,
  logoUrl: optionalUrlSchema,
  coverImageUrl: optionalUrlSchema,
  heroImageUrl: optionalUrlSchema,
  theme: z.preprocess(
    (value) => (value === "light" || value === "dark" ? value : "dark"),
    z.enum(["dark", "light"]),
  ),
  onlineBooking: z.boolean(),
  showTeam: z.boolean(),
  showPrices: z.boolean(),
  showDurations: z.boolean(),
  bookingLeadTimeHours: z.coerce.number().int().min(0).max(168),
  bookingWindowDays: z.coerce.number().int().min(1).max(365),
  slotIntervalMinutes: z.coerce.number().int().min(5).max(120),
  cancellationWindowHours: z.coerce.number().int().min(0).max(168),
  seoTitle: z
    .preprocess(
      (value) => (value === undefined || value === null ? "" : normalizeOptionalString(value)),
      z.string().max(70, "Mantém o título SEO até 70 caracteres."),
    )
    .default(""),
  seoDescription: z
    .preprocess(
      (value) => (value === undefined || value === null ? "" : normalizeOptionalString(value)),
      z.string().max(160, "Mantém a descrição SEO até 160 caracteres."),
    )
    .default(""),
});

export function normalizeOnboardingDraft(input: OnboardingDraft): OnboardingDraft {
  return {
    ...input,
    businessName: ensureString(normalizeString(input.businessName)),
    slug: ensureString(normalizeSlugInput(input.slug)),
    city: ensureString(normalizeString(input.city)),
    phone: ensureString(normalizeOptionalString(input.phone)),
    contactEmail: ensureString(normalizeOptionalEmailInput(input.contactEmail)),
    websiteUrl: ensureString(normalizeOptionalUrlInput(input.websiteUrl)),
    instagramUrl: ensureString(normalizeOptionalUrlInput(input.instagramUrl)),
    description: ensureString(normalizeOptionalString(input.description)),
    headline: ensureString(normalizeOptionalString(input.headline)),
    primaryColor: ensureString(normalizeHexColorInput(input.primaryColor)),
    accentColor: ensureString(normalizeHexColorInput(input.accentColor)),
    logoUrl: ensureString(normalizeOptionalUrlInput(input.logoUrl)),
    coverImageUrl: ensureString(normalizeOptionalUrlInput(input.coverImageUrl)),
    heroImageUrl: ensureString(normalizeOptionalUrlInput(input.heroImageUrl)),
    theme: input.theme === "light" ? "light" : "dark",
    seoTitle: ensureString(normalizeOptionalString(input.seoTitle)),
    seoDescription: ensureString(normalizeOptionalString(input.seoDescription)),
  };
}
