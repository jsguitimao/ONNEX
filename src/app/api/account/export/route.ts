import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { exportAccountData } from "@/lib/account-data";
import { getCurrentBusiness } from "@/lib/business-modules/core";
import { getClientListLockState, verifyClientListLock } from "@/lib/crm/client-list-lock";
import { captureException } from "@/lib/observability";
import { buildRateLimitHeaders, consumeRateLimit } from "@/lib/rate-limit";

// RGPD — direito de acesso/portabilidade (art. 15 e 20). Devolve todos os dados
// da conta do utilizador autenticado em JSON. É uma leitura dos próprios dados,
// por isso não precisa de validação de origem (CSRF), mas é autenticada e
// rate-limited para evitar abuso (export é pesado: varre negócios + reservas).
export async function GET(request: Request) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    namespace: "account-export",
    identifier: userId,
    limit: 5,
    windowMs: 60 * 60_000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos de exportação. Tenta novamente mais tarde." },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  // Cadeado: se o 1.º profissional tiver código, a exportação exige-o. Sem isto,
  // um colega com a sessão aberta contornava o cadeado das listas pelo export.
  // O código vai por HEADER (nunca em query/URL, que ficaria em logs).
  try {
    const business = await getCurrentBusiness();
    const lock = await getClientListLockState(business.id);
    if (lock.enabled) {
      const verifyLimit = await consumeRateLimit({
        namespace: "account-export-verify",
        identifier: userId,
        limit: 10,
        windowMs: 60_000,
      });
      if (!verifyLimit.ok) {
        return NextResponse.json(
          { error: "Demasiadas tentativas. Aguarda um momento.", locked: true },
          { status: 429, headers: buildRateLimitHeaders(verifyLimit) },
        );
      }
      try {
        await verifyClientListLock(business.id, request.headers.get("x-onnex-code"));
      } catch {
        return NextResponse.json(
          { error: "Introduz o código de segurança para exportar.", locked: true },
          { status: 403 },
        );
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    captureException("account.export.lock_check_failed", error, { userId });
    return NextResponse.json({ error: "Não foi possível exportar os dados." }, { status: 500 });
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
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Utilizador não encontrado." }, { status: 404 });
    }
    captureException("account.export.route_failed", error, { userId });
    return NextResponse.json(
      { error: "Não foi possível exportar os dados." },
      { status: 500 },
    );
  }
}
