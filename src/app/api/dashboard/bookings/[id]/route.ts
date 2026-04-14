import { NextResponse } from "next/server";
import { z } from "zod";
import { updateDashboardBooking } from "@/lib/business";
import { readJsonBody } from "@/lib/request-body";

const bookingSchema = z
  .object({
    status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
    startsAt: z.string().datetime().optional(),
    internalNotes: z.string().max(1200).optional(),
  })
  .refine((value) => value.status !== undefined || value.startsAt !== undefined || value.internalNotes !== undefined, {
    message: "Envia pelo menos um campo para atualizar.",
  });

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, { params }: RouteProps) {
  const { id } = await params;
  try {
    const body = await readJsonBody(req);
    const result = bookingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Dados invalidos." }, { status: 400 });
    }

    const booking = await updateDashboardBooking(id, result.data);
    return NextResponse.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    const mapped =
      message === "INVALID_JSON_BODY"
        ? { status: 400, error: "Corpo JSON invalido." }
        : message === "BOOKING_NOT_FOUND"
        ? { status: 404, error: "Reserva nao encontrada." }
        : message === "HORARIO_OCUPADO"
          ? { status: 409, error: "Ja existe uma reserva neste horario para este profissional." }
          : message === "HORARIO_BLOQUEADO"
            ? { status: 409, error: "Este horario esta bloqueado na agenda." }
            : message === "DATA_INVALIDA"
              ? { status: 400, error: "Escolhe uma nova data valida." }
              : message === "BOOKING_RESCHEDULE_NOT_ALLOWED"
                ? { status: 400, error: "Esta reserva nao pode ser remarcada no painel." }
                : message === "PROFISSIONAL_INCOMPATIVEL"
                  ? { status: 400, error: "O profissional atual nao executa este servico." }
                  : { status: 500, error: "Nao foi possivel atualizar a reserva." };

    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
