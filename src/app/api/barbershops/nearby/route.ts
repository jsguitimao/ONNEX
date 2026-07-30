import { NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/geo/geocode";
import { searchBarbershopsNearby } from "@/lib/business-modules/nearby";
import { captureException } from "@/lib/observability";
import { buildRateLimitHeaders, checkRequestRateLimit } from "@/lib/rate-limit";

// Diretório público: dada a localização escrita pelo consumidor (?q=), devolve
// as barbearias registadas ordenadas pela distância. Sem autenticação (é para
// o público). Rate-limit apertado porque cada pedido faz geocoding externo.
export async function GET(req: Request) {
  const rateLimit = await checkRequestRateLimit(req, {
    namespace: "barbershops-nearby",
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos. Tenta novamente daqui a instantes." },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) }
    );
  }

  const query = new URL(req.url).searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json(
      { error: "Indica a tua localização (cidade ou morada)." },
      { status: 400, headers: buildRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const origin = await geocodeAddress(query);
    if (!origin) {
      return NextResponse.json(
        { results: [], notFound: true },
        { headers: buildRateLimitHeaders(rateLimit) }
      );
    }

    const results = await searchBarbershopsNearby(origin);

    return NextResponse.json(
      {
        results: results.map((business) => ({
          ...business,
          distanceKm: Math.round(business.distanceKm * 10) / 10,
        })),
      },
      { headers: buildRateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    captureException("barbershops_nearby.search_failed", error, { query });
    return NextResponse.json(
      { error: "Não foi possível procurar agora. Tenta novamente." },
      { status: 500, headers: buildRateLimitHeaders(rateLimit) }
    );
  }
}
