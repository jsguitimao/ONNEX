import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { exportAccountData } from "@/lib/account-data";
import { captureException } from "@/lib/observability";
import { buildRateLimitHeaders, consumeRateLimit } from "@/lib/rate-limit";

// RGPD — direito de acesso/portabilidade (art. 15 e 20). Devolve todos os dados
// da conta do utilizador autenticado em JSON. É uma leitura dos próprios dados,
// por isso não precisa de validação de origem (CSRF), mas é autenticada e
// rate-limited para evitar abuso (export é pesado: varre negócios + reservas).
export async function GET() {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    namespace: "account-export",
    identifier: userId,
    limit: 5,
    windowMs: 60 * 60_000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos de exportacao. Tenta novamente mais tarde." },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  try {
    const data = await exportAccountData();
    const filename = `bukly-dados-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Utilizador nao encontrado." }, { status: 404 });
    }
    captureException("account.export.route_failed", error, { userId });
    return NextResponse.json(
      { error: "Nao foi possivel exportar os dados." },
      { status: 500 },
    );
  }
}
