import { NextResponse } from "next/server";
import { z } from "zod";
import { findActiveBookingTokenByPhone } from "@/lib/business";
import { buildRateLimitHeaders, checkRequestRateLimit } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request-body";
import { validatePublicMutationOrigin } from "@/lib/request-origin";

// Procura a marcação ativa de um cliente pelo telefone e devolve o token de
// gestão, para o cliente cancelar/remarcar a partir da página. Rate-limit
// APERTADO (5 por 10 min por IP) para evitar que alguém teste telefones em
// massa. Resposta genérica: nunca revela detalhes da marcação, só o token.
const schema = z.object({ phone: z.string().min(6).max(30) });

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function POST(req: Request, { params }: RouteProps) {
  const { slug } = await params;

  const rateLimit = await checkRequestRateLimit(req, {
    namespace: "find-booking",
    limit: 5,
    windowMs: 10 * 60_000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Demasiadas tentativas. Aguarda um pouco antes de tentar de novo." },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const originValidation = validatePublicMutationOrigin(req);
  if (!originValidation.ok) {
    return NextResponse.json(
      { error: "Origem não autorizada." },
      { status: 403, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const body = await readJsonBody(req).catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Telefone inválido." },
      { status: 400, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const result = await findActiveBookingTokenByPhone(slug, parsed.data.phone);
  return NextResponse.json(
    result ? { found: true, token: result.token } : { found: false },
    { headers: buildRateLimitHeaders(rateLimit) },
  );
}
