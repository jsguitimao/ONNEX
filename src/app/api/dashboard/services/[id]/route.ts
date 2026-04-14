import { NextResponse } from "next/server";
import { z } from "zod";
import { updateService } from "@/lib/business";
import { readJsonBody } from "@/lib/request-body";

const serviceSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(280).optional(),
  durationMinutes: z.number().int().min(10).max(240),
  priceCents: z.number().int().min(500).max(100000),
  isActive: z.boolean(),
});

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, { params }: RouteProps) {
  const { id } = await params;

  try {
    const body = await readJsonBody(req);
    const result = serviceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }

    const service = await updateService(id, result.data);
    return NextResponse.json(service);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    const status = message === "INVALID_JSON_BODY" ? 400 : 500;
    const mapped = status === 400 ? "Corpo JSON inválido." : "Não foi possível atualizar o serviço.";
    return NextResponse.json({ error: mapped }, { status });
  }
}
