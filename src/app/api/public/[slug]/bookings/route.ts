import { NextResponse } from "next/server";
import { z } from "zod";
import { createPublicBooking } from "@/lib/business";
import { captureException } from "@/lib/observability";
import { buildRateLimitHeaders, checkRequestRateLimit } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request-body";

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
  let parsed:
    | {
        serviceId: string;
        staffMemberId: string;
      }
    | null = null;
  const rateLimit = checkRequestRateLimit(req, {
    namespace: "public-bookings",
    limit: 12,
    windowMs: 5 * 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Demasiadas tentativas. Aguarda um pouco antes de criar outra reserva." },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await readJsonBody(req);
    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? "Dados invalidos." },
        { status: 400, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    parsed = {
      serviceId: result.data.serviceId,
      staffMemberId: result.data.staffMemberId,
    };

    const booking = await createPublicBooking({
      slug,
      serviceId: result.data.serviceId,
      staffMemberId: result.data.staffMemberId,
      startsAt: result.data.startsAt,
      customerName: result.data.customerName,
      customerEmail: result.data.customerEmail || undefined,
      customerPhone: result.data.customerPhone || undefined,
    });

    return NextResponse.json(
      {
        id: booking.id,
        publicToken: booking.publicToken,
        status: booking.status,
        serviceName: booking.service.name,
        staffName: booking.staffMember?.fullName ?? null,
        startsAt: booking.startsAt,
        manageUrl: `/booking/${booking.publicToken}`,
      },
      {
        headers: buildRateLimitHeaders(rateLimit),
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    const mapped =
      message === "INVALID_JSON_BODY"
        ? { status: 400, error: "Corpo JSON invalido." }
        : message === "HORARIO_OCUPADO"
        ? { status: 409, error: "Este horario acabou de ficar indisponivel." }
        : message === "ONLINE_BOOKING_DISABLED"
          ? { status: 403, error: "As reservas online estao desativadas para esta pagina." }
        : message === "DATA_INVALIDA"
            ? { status: 400, error: "Escolhe um horario dentro da antecedencia e janela permitidas." }
            : message === "HORARIO_BLOQUEADO"
              ? { status: 409, error: "Este horario esta bloqueado na agenda." }
              : message === "PROFISSIONAL_INCOMPATIVEL"
                ? { status: 400, error: "Este profissional nao executa o servico escolhido." }
                : message === "DADOS_INVALIDOS"
                  ? { status: 400, error: "Servico, profissional ou localizacao invalidos." }
                  : { status: 500, error: "Nao foi possivel criar a reserva." };

    captureException("public_booking.create_failed", error, {
      slug,
      serviceId: parsed?.serviceId,
      staffMemberId: parsed?.staffMemberId,
    });

    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status, headers: buildRateLimitHeaders(rateLimit) }
    );
  }
}
