import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteAccount } from "@/lib/account-data";
import { captureException } from "@/lib/observability";
import { buildRateLimitHeaders, consumeRateLimit } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request-body";
import { validateAuthenticatedMutationOrigin } from "@/lib/request-origin";

const DELETE_CONFIRMATION = "APAGAR CONTA";

const deleteAccountSchema = z.object({
  confirmation: z.literal(DELETE_CONFIRMATION),
});

export async function POST(req: Request) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const origin = validateAuthenticatedMutationOrigin(req);
  if (!origin.ok) {
    return NextResponse.json(
      { error: "Origem não autorizada.", code: origin.reason },
      { status: 403 },
    );
  }

  const rateLimit = await consumeRateLimit({
    namespace: "account-delete",
    identifier: userId,
    limit: 3,
    windowMs: 60 * 60_000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Demasiadas tentativas. Tenta novamente mais tarde." },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  try {
    const body = await readJsonBody(req);
    deleteAccountSchema.parse(body);
    await deleteAccount();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JSON_BODY") {
      return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: `Confirmação inválida. Escreve exatamente "${DELETE_CONFIRMATION}".`,
          code: "INVALID_CONFIRMATION",
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Utilizador não encontrado." }, { status: 404 });
    }

    captureException("account.delete.route_failed", error, { userId });
    return NextResponse.json({ error: "Não foi possível apagar a conta." }, { status: 500 });
  }
}
