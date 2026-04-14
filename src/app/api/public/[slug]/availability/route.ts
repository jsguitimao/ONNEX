import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableSlots } from "@/lib/business";
import { captureException } from "@/lib/observability";
import { buildRateLimitHeaders, checkRequestRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  serviceId: z.string().min(1),
  staffMemberId: z.string().min(1),
  date: z.string().min(1),
});

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(req: Request, { params }: RouteProps) {
  const { slug } = await params;
  const rateLimit = checkRequestRateLimit(req, {
    namespace: "public-availability",
    limit: 45,
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
    serviceId: url.searchParams.get("serviceId"),
    staffMemberId: url.searchParams.get("staffMemberId"),
    date: url.searchParams.get("date"),
  });

  if (!result.success) {
    return NextResponse.json(
      { error: "Parâmetros inválidos." },
      { status: 400, headers: buildRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const slots = await getAvailableSlots({
      slug,
      ...result.data,
    });

    return NextResponse.json(
      { slots },
      {
        headers: buildRateLimitHeaders(rateLimit),
      }
    );
  } catch (error) {
    captureException("public_availability.fetch_failed", error, {
      slug,
      serviceId: result.data.serviceId,
      staffMemberId: result.data.staffMemberId,
    });

    return NextResponse.json(
      { error: "Não foi possível carregar os horários disponíveis." },
      { status: 500, headers: buildRateLimitHeaders(rateLimit) }
    );
  }
}
