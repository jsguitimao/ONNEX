import { NextResponse } from "next/server";
import { z } from "zod";
import { createManualBooking, getBookingAgenda, getBookingAgendaView } from "@/lib/business";
import { readJsonBody } from "@/lib/request-body";

const bookingSchema = z.object({
  serviceId: z.string().min(1),
  staffMemberId: z.string().min(1),
  startsAt: z.string().datetime(),
  customerName: z.string().min(2).max(80),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().min(6).max(30).optional().or(z.literal("")),
  status: z.enum(["PENDING", "CONFIRMED"]).default("CONFIRMED"),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ?? undefined;
    const staffMemberId = searchParams.get("staffMemberId") ?? undefined;
    const includeWeek = searchParams.get("includeWeek") === "1";

    const snapshot = includeWeek
      ? await getBookingAgendaView({ date, staffMemberId })
      : await getBookingAgenda({ date, staffMemberId });
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("GET bookings agenda error:", error);
    return NextResponse.json({ error: "Erro ao carregar a agenda." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const result = bookingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Dados invalidos." }, { status: 400 });
    }

    const booking = await createManualBooking({
      serviceId: result.data.serviceId,
      staffMemberId: result.data.staffMemberId,
      startsAt: result.data.startsAt,
      customerName: result.data.customerName,
      customerEmail: result.data.customerEmail || undefined,
      customerPhone: result.data.customerPhone || undefined,
      status: result.data.status,
    });

    return NextResponse.json(booking);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    const mapped =
      message === "INVALID_JSON_BODY"
        ? { status: 400, error: "Corpo JSON invalido." }
        : message === "HORARIO_OCUPADO"
        ? { status: 409, error: "Ja existe uma reserva neste horario para este profissional." }
        : message === "DADOS_INVALIDOS"
          ? { status: 400, error: "Servico ou profissional invalido." }
          : message === "PROFISSIONAL_INCOMPATIVEL"
            ? { status: 400, error: "Este profissional nao executa o servico escolhido." }
            : message === "HORARIO_BLOQUEADO"
              ? { status: 409, error: "Este horario esta bloqueado na agenda." }
              : message === "DATA_INVALIDA"
                ? { status: 400, error: "Escolhe uma data valida para a reserva." }
            : { status: 500, error: "Erro ao criar reserva manual." };

    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
