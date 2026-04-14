import { NextResponse } from "next/server";
import { z } from "zod";
import { getBusinessForOnboarding, updateBusinessFromOnboarding } from "@/lib/business";
import { readJsonBody } from "@/lib/request-body";

const onboardingSchema = z.object({
  businessName: z.string().min(2).max(100),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minusculas, numeros e hifen no slug."),
  city: z.string().min(2).max(80),
  phone: z.string().min(6).max(30),
  contactEmail: z.string().email().or(z.literal("")),
  websiteUrl: z.string().url().or(z.literal("")),
  description: z.string().min(10).max(500),
  headline: z.string().min(10).max(140),
  subheadline: z.string().min(20).max(300),
  welcomeMessage: z.string().min(10).max(240),
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{6})$/),
  accentColor: z.string().regex(/^#([0-9a-fA-F]{6})$/),
  logoUrl: z.string().url().or(z.literal("")),
  coverImageUrl: z.string().url().or(z.literal("")),
  onlineBooking: z.boolean(),
  showTeam: z.boolean(),
  showPrices: z.boolean(),
  showDurations: z.boolean(),
  bookingLeadTimeHours: z.coerce.number().int().min(0).max(168),
  bookingWindowDays: z.coerce.number().int().min(1).max(365),
  slotIntervalMinutes: z.coerce.number().int().min(5).max(120),
  cancellationWindowHours: z.coerce.number().int().min(0).max(168),
});

export async function GET() {
  try {
    const business = await getBusinessForOnboarding();
    return NextResponse.json(business);
  } catch (error) {
    console.error("GET onboarding error:", error);
    return NextResponse.json({ error: "Erro ao carregar onboarding." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await readJsonBody(req);
    const payload = onboardingSchema.parse(body);
    const business = await updateBusinessFromOnboarding(payload);

    return NextResponse.json({
      businessName: business.name,
      slug: business.slug,
      primaryColor: business.primaryColor,
      accentColor: business.accentColor,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JSON_BODY") {
      return NextResponse.json({ error: "Corpo JSON invalido." }, { status: 400 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados invalidos." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "SLUG_ALREADY_TAKEN") {
      return NextResponse.json({ error: "Este slug público já esta em uso." }, { status: 409 });
    }

    console.error("PUT onboarding error:", error);
    return NextResponse.json({ error: "Erro ao guardar onboarding." }, { status: 500 });
  }
}
