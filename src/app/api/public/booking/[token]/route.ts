import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicBookingByToken, reschedulePublicBookingByToken, updatePublicBookingByToken } from "@/lib/business";
import { captureException } from "@/lib/observability";
import { buildRateLimitHeaders, checkRequestRateLimit } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request-body";

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

export async function GET(req: Request, { params }: RouteProps) {
  const { token } = await params;
  const rateLimit = checkRequestRateLimit(req, {
    namespace: "public-booking-read",
    limit: 60,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos. Aguarda um pouco antes de voltares a abrir a reserva." },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const booking = await getPublicBookingByToken(token);

    if (!booking) {
      return NextResponse.json(
        { error: "Reserva nao encontrada." },
        { status: 404, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    return NextResponse.json(booking, {
      headers: buildRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    captureException("public_booking.fetch_failed", error, { token });
    return NextResponse.json(
      { error: "Nao foi possivel carregar a reserva." },
      { status: 500, headers: buildRateLimitHeaders(rateLimit) }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteProps) {
  const { token } = await params;
  let action: "confirm" | "cancel" | "reschedule" | undefined;
  const rateLimit = checkRequestRateLimit(req, {
    namespace: "public-booking-write",
    limit: 12,
    windowMs: 10 * 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Demasiadas tentativas. Aguarda um pouco antes de alterares a reserva." },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await readJsonBody(req);
    const result = actionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Acao invalida." },
        { status: 400, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    action = result.data.action;

    const booking =
      result.data.action === "reschedule"
        ? await reschedulePublicBookingByToken(token, result.data.startsAt!)
        : await updatePublicBookingByToken(token, result.data.action);

    if (!booking) {
      return NextResponse.json(
        { error: "Reserva nao encontrada." },
        { status: 404, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    return NextResponse.json(booking, {
      headers: buildRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    const mapped =
      message === "INVALID_JSON_BODY"
        ? { status: 400, error: "Corpo JSON invalido." }
        : message === "BOOKING_ACTION_NOT_ALLOWED"
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

    captureException("public_booking.update_failed", error, {
      token,
      action,
    });

    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status, headers: buildRateLimitHeaders(rateLimit) }
    );
  }
}
