import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicBookingByToken, reschedulePublicBookingByToken, updatePublicBookingByToken } from "@/lib/business";
import { captureException } from "@/lib/observability";
import { buildRateLimitHeaders, checkRequestRateLimit } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request-body";
import { validatePublicMutationOrigin } from "@/lib/request-origin";

const actionSchema = z
  .object({
    action: z.enum(["cancel", "reschedule"]),
    startsAt: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "reschedule" && !value.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startsAt"],
        message: "Escolhe um novo horário.",
      });
    }
  });

type RouteProps = {
  params: Promise<{ token: string }>;
};

export async function GET(req: Request, { params }: RouteProps) {
  const { token } = await params;
  const rateLimit = await checkRequestRateLimit(req, {
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
        { error: "Reserva não encontrada." },
        { status: 404, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    return NextResponse.json(booking, {
      headers: buildRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    captureException("public_booking.fetch_failed", error, { token });
    return NextResponse.json(
      { error: "Não foi possível carregar a reserva." },
      { status: 500, headers: buildRateLimitHeaders(rateLimit) }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteProps) {
  const { token } = await params;
  let action: "cancel" | "reschedule" | undefined;
  const rateLimit = await checkRequestRateLimit(req, {
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

  const originValidation = validatePublicMutationOrigin(req);
  if (!originValidation.ok) {
    return NextResponse.json(
      { error: "Origem não autorizada para alterar a reserva." },
      { status: 403, headers: buildRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await readJsonBody(req);
    const result = actionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Ação inválida." },
        { status: 400, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    action = result.data.action;

    const booking =
      result.data.action === "reschedule"
        ? await reschedulePublicBookingByToken(token, result.data.startsAt!)
        : await updatePublicBookingByToken(token, "cancel");

    if (!booking) {
      return NextResponse.json(
        { error: "Reserva não encontrada." },
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
        ? { status: 400, error: "Corpo JSON inválido." }
        : message === "BOOKING_TOKEN_EXPIRED"
          ? { status: 410, error: "Este link de gestão já expirou." }
          : message === "BOOKING_ACTION_NOT_ALLOWED"
            ? { status: 409, error: "Esta ação já não está disponível para a reserva." }
            : message === "CANCEL_WINDOW_EXPIRED"
              ? { status: 409, error: "O prazo automático de cancelamento já expirou." }
              : message === "RESCHEDULE_WINDOW_EXPIRED"
                ? { status: 409, error: "O prazo automático para remarcar já expirou." }
                : message === "HORARIO_OCUPADO"
                  ? { status: 409, error: "Este horário acabou de ficar indisponível." }
                  : message === "HORARIO_BLOQUEADO"
                    ? { status: 409, error: "Este horário está bloqueado na agenda." }
                    : message === "FORA_DA_DISPONIBILIDADE"
                      ? { status: 400, error: "Este horário não está dentro da disponibilidade do profissional." }
                      : message === "DATA_INVALIDA"
                      ? { status: 400, error: "Escolhe um novo horário válido dentro da janela permitida." }
                      : { status: 500, error: "Não foi possível atualizar a reserva." };

    // Só reportamos ao Sentry erros INESPERADOS (500). Validações esperadas
    // (link expirado, prazo de cancelamento/remarcação esgotado, horário
    // ocupado, etc.) são respostas normais ao cliente — não são falhas.
    if (mapped.status >= 500) {
      captureException("public_booking.update_failed", error, {
        token,
        action,
      });
    }

    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status, headers: buildRateLimitHeaders(rateLimit) }
    );
  }
}
