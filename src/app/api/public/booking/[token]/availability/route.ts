import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicBookingRescheduleSlots } from "@/lib/business";
import { captureException } from "@/lib/observability";
import { buildRateLimitHeaders, checkRequestRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  date: z.string().min(1),
});

type RouteProps = {
  params: Promise<{ token: string }>;
};

export async function GET(req: Request, { params }: RouteProps) {
  const { token } = await params;
  const rateLimit = checkRequestRateLimit(req, {
    namespace: "public-booking-reschedule-slots",
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos. Aguarda um pouco antes de procurar mais horários." },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) }
    );
  }

  const url = new URL(req.url);
  const result = schema.safeParse({
    date: url.searchParams.get("date"),
  });

  if (!result.success) {
    return NextResponse.json(
      { error: "Parâmetros inválidos." },
      { status: 400, headers: buildRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const slots = await getPublicBookingRescheduleSlots(token, result.data.date);

    if (!slots) {
      return NextResponse.json(
        { error: "Reserva não encontrada." },
        { status: 404, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    return NextResponse.json(
      { slots },
      {
        headers: buildRateLimitHeaders(rateLimit),
      }
    );
  } catch (error) {
    captureException("public_booking_reschedule_slots.fetch_failed", error, { token });
    return NextResponse.json(
      { error: "Não foi possível carregar os horários para remarcação." },
      { status: 500, headers: buildRateLimitHeaders(rateLimit) }
    );
  }
}
