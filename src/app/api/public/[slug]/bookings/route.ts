import { NextResponse } from "next/server";
import { z } from "zod";
import { createPublicBooking } from "@/lib/business";

const schema = z.object({
  serviceId: z.string().min(1),
  staffMemberId: z.string().min(1),
  startsAt: z.string().datetime(),
  customerName: z.string().min(2).max(80),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().min(6).max(30).optional().or(z.literal("")),
});

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function POST(req: Request, { params }: RouteProps) {
  const { slug } = await params;
  const body = await req.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  try {
    const booking = await createPublicBooking({
      slug,
      serviceId: result.data.serviceId,
      staffMemberId: result.data.staffMemberId,
      startsAt: result.data.startsAt,
      customerName: result.data.customerName,
      customerEmail: result.data.customerEmail || undefined,
      customerPhone: result.data.customerPhone || undefined,
    });

    return NextResponse.json({
      id: booking.id,
      status: booking.status,
      serviceName: booking.service.name,
      staffName: booking.staffMember?.fullName ?? null,
      startsAt: booking.startsAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    const mapped =
      message === "HORARIO_OCUPADO"
        ? { status: 409, error: "Este horário acabou de ficar indisponível." }
        : message === "DATA_INVALIDA"
          ? { status: 400, error: "Escolhe um horário futuro válido." }
          : { status: 400, error: "Não foi possível criar a reserva." };

    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
