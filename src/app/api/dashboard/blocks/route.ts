import { NextResponse } from "next/server";
import { z } from "zod";
import { createScheduleBlock } from "@/lib/business";
import { readJsonBody } from "@/lib/request-body";

const blockSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().max(160).optional().or(z.literal("")),
  staffMemberId: z.string().optional().or(z.literal("")),
});

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const result = blockSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }

    const block = await createScheduleBlock({
      startsAt: result.data.startsAt,
      endsAt: result.data.endsAt,
      reason: result.data.reason || undefined,
      staffMemberId: result.data.staffMemberId || undefined,
    });

    return NextResponse.json(block);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    const mapped =
      message === "INVALID_JSON_BODY"
        ? { status: 400, error: "Corpo JSON inválido." }
        : message === "BLOQUEIO_INVALIDO"
          ? { status: 400, error: "Define um intervalo de bloqueio válido." }
          : message === "STAFF_NOT_FOUND"
            ? { status: 404, error: "Profissional não encontrado." }
            : { status: 500, error: "Erro ao criar bloqueio." };

    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
