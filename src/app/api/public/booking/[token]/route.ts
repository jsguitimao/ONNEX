import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicBookingByToken, reschedulePublicBookingByToken, updatePublicBookingByToken } from "@/lib/business";

const actionSchema = z
  .object({
    action: z.enum(["confirm", "cancel", "reschedule"]),
    startsAt: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "reschedule" && !value.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startsAt"],
        message: "Escolhe um novo horario.",
      });
    }
  });

type RouteProps = {
  params: Promise<{ token: string }>;
};

export async function GET(_: Request, { params }: RouteProps) {
  const { token } = await params;
  const booking = await getPublicBookingByToken(token);

  if (!booking) {
    return NextResponse.json({ error: "Reserva nao encontrada." }, { status: 404 });
  }

  return NextResponse.json(booking);
}

export async function PATCH(req: Request, { params }: RouteProps) {
  const { token } = await params;
  const body = await req.json();
  const result = actionSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
  }

  try {
    const booking =
      result.data.action === "reschedule"
        ? await reschedulePublicBookingByToken(token, result.data.startsAt!)
        : await updatePublicBookingByToken(token, result.data.action);

    if (!booking) {
      return NextResponse.json({ error: "Reserva nao encontrada." }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    const mapped =
      message === "BOOKING_ACTION_NOT_ALLOWED"
        ? { status: 409, error: "Esta acao ja nao esta disponivel para a reserva." }
        : message === "CANCEL_WINDOW_EXPIRED"
          ? { status: 409, error: "O prazo automatico de cancelamento ja expirou." }
          : message === "RESCHEDULE_WINDOW_EXPIRED"
            ? { status: 409, error: "O prazo automatico para remarcar ja expirou." }
            : message === "HORARIO_OCUPADO"
              ? { status: 409, error: "Este horario acabou de ficar indisponivel." }
              : message === "HORARIO_BLOQUEADO"
                ? { status: 409, error: "Este horario esta bloqueado na agenda." }
                : message === "DATA_INVALIDA"
                  ? { status: 400, error: "Escolhe um novo horario valido dentro da janela permitida." }
          : { status: 500, error: "Nao foi possivel atualizar a reserva." };

    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
