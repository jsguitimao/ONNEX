import { NextResponse } from "next/server";
import { getPublicBusinessPayload } from "@/lib/business";
import { captureException } from "@/lib/observability";
import { buildRateLimitHeaders, checkRequestRateLimit } from "@/lib/rate-limit";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(req: Request, { params }: RouteProps) {
  const { slug } = await params;
  const rateLimit = checkRequestRateLimit(req, {
    namespace: "public-business",
    limit: 120,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos. Tenta novamente daqui a instantes." },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const business = await getPublicBusinessPayload(slug);

    if (!business) {
      return NextResponse.json(
        { error: "Negócio não encontrado." },
        { status: 404, headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    return NextResponse.json(business, {
      headers: buildRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    captureException("public_business.fetch_failed", error, { slug });
    return NextResponse.json(
      { error: "Não foi possível carregar a página pública." },
      { status: 500, headers: buildRateLimitHeaders(rateLimit) }
    );
  }
}
