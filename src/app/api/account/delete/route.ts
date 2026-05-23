import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteAccount } from "@/lib/account-data";
import { buildRateLimitHeaders, consumeRateLimit } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request-body";
import { validatePublicMutationOrigin } from "@/lib/request-origin";

const DELETE_CONFIRMATION = "APAGAR CONTA";

const deleteAccountSchema = z.object({
  confirmation: z.literal(DELETE_CONFIRMATION),
});

export async function POST(req: Request) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const origin = validatePublicMutationOrigin(req);
  if (!origin.ok) {
    return NextResponse.json(
      { error: "Origem nao autorizada.", code: origin.reason },
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
      return NextResponse.json({ error: "Corpo JSON invalido." }, { status: 400 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: `Confirmacao invalida. Escreve exatamente "${DELETE_CONFIRMATION}".`,
          code: "INVALID_CONFIRMATION",
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Utilizador nao encontrado." }, { status: 404 });
    }

    console.error("[account.delete] route_failed", error);
    return NextResponse.json({ error: "Nao foi possivel apagar a conta." }, { status: 500 });
  }
}
