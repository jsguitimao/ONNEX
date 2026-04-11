import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicBookingByToken, updatePublicBookingByToken } from "@/lib/business";

const actionSchema = z.object({
  action: z.enum(["confirm", "cancel"]),
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
    const booking = await updatePublicBookingByToken(token, result.data.action);

    if (!booking) {
      return NextResponse.json({ error: "Reserva nao encontrada." }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    const mapped =
      message === "BOOKING_ACTION_NOT_ALLOWED"
        ? { status: 409, error: "Esta acao ja nao esta disponivel para a reserva." }
        : { status: 500, error: "Nao foi possivel atualizar a reserva." };

    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
