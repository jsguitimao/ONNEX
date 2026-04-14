import { NextResponse } from "next/server";
import { z } from "zod";
import { createService } from "@/lib/business";
import { readJsonBody } from "@/lib/request-body";

const serviceSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(280).optional(),
  durationMinutes: z.number().int().min(10).max(240),
  priceCents: z.number().int().min(500).max(100000),
});

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const result = serviceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Dados invalidos." }, { status: 400 });
    }

    const service = await createService(result.data);
    return NextResponse.json(service);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    const status = message === "INVALID_JSON_BODY" ? 400 : 500;
    const mapped = status === 400 ? "Corpo JSON invalido." : "Nao foi possivel criar o servico.";
    return NextResponse.json({ error: mapped }, { status });
  }
}
