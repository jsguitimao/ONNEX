import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentBusiness } from "@/lib/business-modules/core";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v", "qt"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif", "heic", "heif"]);

export const runtime = "nodejs";

export async function POST(req: Request) {
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
    const message =
      error instanceof Error ? error.message : "Erro ao carregar ficheiro.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
