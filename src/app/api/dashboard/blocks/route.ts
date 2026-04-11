import { NextResponse } from "next/server";
import { z } from "zod";
import { createScheduleBlock } from "@/lib/business";

const blockSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().max(160).optional().or(z.literal("")),
  staffMemberId: z.string().optional().or(z.literal("")),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = blockSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Dados invalidos." }, { status: 400 });
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
      message === "BLOQUEIO_INVALIDO"
        ? { status: 400, error: "Define um intervalo de bloqueio valido." }
        : message === "STAFF_NOT_FOUND"
          ? { status: 404, error: "Profissional nao encontrado." }
          : { status: 500, error: "Erro ao criar bloqueio." };

    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
