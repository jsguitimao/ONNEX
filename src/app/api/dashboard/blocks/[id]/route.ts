import { NextResponse } from "next/server";
import { deleteScheduleBlock } from "@/lib/business";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    await deleteScheduleBlock(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    const mapped =
      message === "BLOQUEIO_NAO_ENCONTRADO"
        ? { status: 404, error: "Bloqueio não encontrado." }
        : { status: 500, error: "Erro ao remover bloqueio." };

    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
