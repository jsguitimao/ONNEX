import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentBusiness } from "@/lib/business-modules/core";
import { buildRateLimitHeaders, checkRequestRateLimit } from "@/lib/rate-limit";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const VIDEO_EXTENSIONS = new Set(["mp4", "webm"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif", "heic", "heif"]);

export const runtime = "nodejs";

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

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const business = await getCurrentBusiness();

        const rawExtension = pathname.split(".").pop()?.toLowerCase() ?? "";
        const isVideoByExt = VIDEO_EXTENSIONS.has(rawExtension);
        const isImageByExt = IMAGE_EXTENSIONS.has(rawExtension);
        const normalizedPathname = pathname.replace(/\\/g, "/");

        if (pathname.length > 180 || normalizedPathname.includes("../") || (!isVideoByExt && !isImageByExt)) {
          throw new Error(
            "Formato não suportado. Imagens: JPG, PNG, WEBP, AVIF, HEIC. Vídeos: MP4, WEBM, MOV, M4V.",
          );
        }

        return {
          allowedContentTypes: isVideoByExt ? ["video/*"] : ["image/*"],
          maximumSizeInBytes: isVideoByExt ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE,
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
    console.error("[upload] error", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split("\n").slice(0, 3).join(" | ") : undefined,
    });

    // Whitelist de mensagens user-facing explicitamente lancadas em
    // onBeforeGenerateToken. Qualquer outra coisa (Vercel Blob internals,
    // Prisma, AUTH_REQUIRED, JSON parse, etc.) e tratada com mensagem
    // generica para nao vazar detalhes internos ao client.
    if (error instanceof Error && error.message.startsWith("Formato não suportado")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Autenticação requerida." }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Não foi possível carregar o ficheiro." },
      { status: 500 },
    );
  }
}
