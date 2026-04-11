import { NextResponse } from "next/server";
import { z } from "zod";
import { getBusinessForOnboarding, updateBusinessFromOnboarding } from "@/lib/business";

const onboardingSchema = z.object({
  businessName: z.string().min(2).max(100),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen no slug."),
  city: z.string().min(2).max(80),
  phone: z.string().min(6).max(30),
  headline: z.string().min(10).max(140),
  subheadline: z.string().min(20).max(300),
  welcomeMessage: z.string().min(10).max(240),
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{6})$/),
  accentColor: z.string().regex(/^#([0-9a-fA-F]{6})$/),
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
    const body = await req.json();
    const payload = onboardingSchema.parse(body);
    const business = await updateBusinessFromOnboarding(payload);

    return NextResponse.json({
      businessName: business.name,
      slug: business.slug,
      primaryColor: business.primaryColor,
      accentColor: business.accentColor,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }

    console.error("PUT onboarding error:", error);
    return NextResponse.json({ error: "Erro ao guardar onboarding." }, { status: 500 });
  }
}
