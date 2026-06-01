import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentBusiness } from "@/lib/business-modules/core";
import { captureException } from "@/lib/observability";
import { buildRateLimitHeaders, checkRequestRateLimit } from "@/lib/rate-limit";
import { validateAuthenticatedMutationOrigin } from "@/lib/request-origin";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const EXTENSION_RULES = {
  jpg: { kind: "image", contentTypes: ["image/jpeg"] },
  jpeg: { kind: "image", contentTypes: ["image/jpeg"] },
  png: { kind: "image", contentTypes: ["image/png"] },
  webp: { kind: "image", contentTypes: ["image/webp"] },
  avif: { kind: "image", contentTypes: ["image/avif"] },
  gif: { kind: "image", contentTypes: ["image/gif"] },
  heic: { kind: "image", contentTypes: ["image/heic", "image/heif"] },
  heif: { kind: "image", contentTypes: ["image/heic", "image/heif"] },
  mp4: { kind: "video", contentTypes: ["video/mp4"] },
  webm: { kind: "video", contentTypes: ["video/webm"] },
  mov: { kind: "video", contentTypes: ["video/quicktime"] },
  m4v: { kind: "video", contentTypes: ["video/x-m4v", "video/mp4"] },
} as const;

export const runtime = "nodejs";

function getUploadRule(pathname: string) {
  const normalizedPathname = pathname.replace(/\\/g, "/");
  const fileName = normalizedPathname.split("/").pop() ?? "";
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (
    pathname.length > 180 ||
    fileName.length === 0 ||
    fileName.startsWith(".") ||
    normalizedPathname.includes("../") ||
    /[\u0000-\u001f]/.test(pathname)
  ) {
    return null;
  }

  return EXTENSION_RULES[extension as keyof typeof EXTENSION_RULES] ?? null;
}

export async function POST(req: Request) {
  const rateLimit = await checkRequestRateLimit(req, {
    namespace: "upload",
    limit: 30,
    windowMs: 5 * 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Demasiados uploads. Aguarda alguns minutos." },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  try {
    const body = (await req.json()) as HandleUploadBody;

    if (body.type === "blob.generate-client-token") {
      const originValidation = validateAuthenticatedMutationOrigin(req);
      if (!originValidation.ok) {
        return NextResponse.json(
          { error: "Origem nao autorizada.", code: originValidation.reason },
          { status: 403, headers: buildRateLimitHeaders(rateLimit) },
        );
      }
    }

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const business = await getCurrentBusiness();
        const rule = getUploadRule(pathname);

        if (!rule) {
          throw new Error(
            "Formato nao suportado. Imagens: JPG, PNG, WEBP, AVIF, HEIC. Videos: MP4, WEBM, MOV, M4V.",
          );
        }

        return {
          allowedContentTypes: [...rule.contentTypes],
          maximumSizeInBytes: rule.kind === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ businessId: business.id }),
        };
      },
      onUploadCompleted: async () => {
        // No server-side bookkeeping required: the URL is stored when the form is saved.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Formato nao suportado")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Autenticacao requerida." }, { status: 401 });
    }

    captureException("upload.failed", error);

    return NextResponse.json(
      { error: "Nao foi possivel carregar o ficheiro." },
      { status: 500 },
    );
  }
}
