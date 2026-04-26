import { NextResponse } from "next/server";
import { exportAccountData } from "@/lib/account-data";
import { buildRateLimitHeaders, checkRequestRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const rateLimit = await checkRequestRateLimit(req, {
    namespace: "account-export",
    limit: 5,
    windowMs: 60 * 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos de exportação. Aguarda uma hora." },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  try {
    const data = await exportAccountData();
    const filename = `bukly-export-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Utilizador não encontrado." }, { status: 404 });
    }

    console.error("GET /api/account/export error:", error);
    return NextResponse.json({ error: "Erro ao exportar dados." }, { status: 500 });
  }
}
