import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getCurrentBusiness } from "@/lib/business-modules/core";
import { loadEditorDraft } from "@/lib/page-editor/load";
import { editorDraftSchema } from "@/lib/page-editor/schema";
import { PageEditorError, saveEditorDraft } from "@/lib/page-editor/save";
import { captureException } from "@/lib/observability";
import { buildRateLimitHeaders, checkRequestRateLimit } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request-body";
import { validateAuthenticatedMutationOrigin } from "@/lib/request-origin";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  try {
    const draft = await loadEditorDraft();
    return NextResponse.json(draft);
  } catch (error) {
    captureException("dashboard.load_failed", error);
    return NextResponse.json({ error: "Erro ao carregar a página." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const rateLimit = await checkRequestRateLimit(req, {
    namespace: "dashboard-write",
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Demasiadas alterações em pouco tempo. Aguarda um momento." },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const originValidation = validateAuthenticatedMutationOrigin(req);
  if (!originValidation.ok) {
    return NextResponse.json(
      { error: "Origem não autorizada.", code: originValidation.reason },
      { status: 403, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  try {
    const body = await readJsonBody(req);
    const draft = editorDraftSchema.parse(body);
    const business = await getCurrentBusiness();
    await saveEditorDraft(business.id, draft);
    // Atualiza a página pública na hora (sem esperar pelo ISR de 60s).
    revalidatePath(`/${draft.slug}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JSON_BODY") {
      return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }
    if (error instanceof PageEditorError) {
      const status = error.code === "SLUG_TAKEN" ? 409 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    captureException("dashboard.save_failed", error);
    return NextResponse.json({ error: "Erro ao guardar." }, { status: 500 });
  }
}
