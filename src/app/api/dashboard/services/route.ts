import { NextResponse } from "next/server";
import { z } from "zod";
import { createService } from "@/lib/business";

const serviceSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(280).optional(),
  durationMinutes: z.number().int().min(10).max(240),
  priceCents: z.number().int().min(500).max(100000),
});

export async function POST(req: Request) {
  const body = await req.json();
  const result = serviceSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const service = await createService(result.data);
  return NextResponse.json(service);
}
