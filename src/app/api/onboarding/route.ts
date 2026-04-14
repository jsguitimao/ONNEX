import { NextResponse } from "next/server";
import { z } from "zod";
import { getBusinessForOnboarding, updateBusinessFromOnboarding } from "@/lib/business";
import { onboardingSchema } from "@/lib/onboarding-input";
import { readJsonBody } from "@/lib/request-body";

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
      return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }

    if (error instanceof Error && error.message === "SLUG_ALREADY_TAKEN") {
      return NextResponse.json({ error: "Este slug público já está em uso." }, { status: 409 });
    }

    console.error("PUT onboarding error:", error);
    return NextResponse.json({ error: "Erro ao guardar onboarding." }, { status: 500 });
  }
}
