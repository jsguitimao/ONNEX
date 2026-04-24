import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentBusiness } from "@/lib/business-modules/core";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 25 * 1024 * 1024;

const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v", "qt"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif", "heic", "heif"]);

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const business = await getCurrentBusiness();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Ficheiro em falta." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Ficheiro vazio." }, { status: 400 });
    }

    const rawExtension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const declaredType = (file.type || "").toLowerCase();
    const isVideoByMime = declaredType.startsWith("video/");
    const isImageByMime = declaredType.startsWith("image/");
    const isVideoByExt = VIDEO_EXTENSIONS.has(rawExtension);
    const isImageByExt = IMAGE_EXTENSIONS.has(rawExtension);
    const isVideo = isVideoByMime || (!isImageByMime && isVideoByExt);
    const isImage = isImageByMime || (!isVideo && isImageByExt);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Formato não suportado. Imagens: JPG, PNG, WEBP, AVIF, HEIC. Vídeos: MP4, WEBM, MOV, M4V." },
        { status: 415 },
      );
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      const limitMb = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json(
        { error: `Ficheiro excede ${limitMb}MB.` },
        { status: 413 },
      );
    }

    const fallbackExtension = isVideo ? "mp4" : "jpg";
    const safeExtension = /^[a-z0-9]{2,5}$/.test(rawExtension) ? rawExtension : fallbackExtension;
    const pathname = `business/${business.id}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("POST upload error:", error);
    return NextResponse.json({ error: "Erro ao carregar ficheiro." }, { status: 500 });
  }
}
