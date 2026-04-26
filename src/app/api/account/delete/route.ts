import { NextResponse } from "next/server";
import { deleteAccount } from "@/lib/account-data";
import { buildRateLimitHeaders, checkRequestRateLimit } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request-body";

const REQUIRED_CONFIRMATION = "APAGAR";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rateLimit = await checkRequestRateLimit(req, {
    namespace: "account-delete",
    limit: 5,
    windowMs: 60 * 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Demasiados pedidos. Aguarda uma hora." },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  try {
    const body = await readJsonBody(req);
    const confirmation = (body as { confirmation?: unknown })?.confirmation;

    if (confirmation !== REQUIRED_CONFIRMATION) {
      return NextResponse.json(
        { error: `Confirmação inválida. Escreve "${REQUIRED_CONFIRMATION}" para apagar a conta.` },
        { status: 400 },
      );
    }

    await deleteAccount();

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JSON_BODY") {
      return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Utilizador não encontrado." }, { status: 404 });
    }

    console.error("POST /api/account/delete error:", error);
    return NextResponse.json({ error: "Erro ao apagar conta." }, { status: 500 });
  }
}
