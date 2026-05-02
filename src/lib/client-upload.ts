"use client";

import { upload } from "@vercel/blob/client";
import { VIDEO_EXTENSIONS } from "@/lib/media-url";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

function isVideo(file: File) {
  if ((file.type || "").toLowerCase().startsWith("video/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTENSIONS.some((videoExt) => videoExt === ext);
}

function pickPathname(file: File) {
  const fallbackExt = isVideo(file) ? "mp4" : "jpg";
  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? fallbackExt;
  const safeExt = /^[a-z0-9]{2,5}$/.test(rawExt) ? rawExt : fallbackExt;
  return `media/${Date.now()}.${safeExt}`;
}

export type UploadProgress = {
  percent: number;
  loaded: number;
  total: number;
};

export async function uploadMedia(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> {
  if (!file) {
    throw new Error("Ficheiro em falta.");
  }
  if (file.size === 0) {
    throw new Error("Ficheiro vazio.");
  }

  const limit = isVideo(file) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > limit) {
    const limitMb = Math.round(limit / (1024 * 1024));
    throw new Error(`Ficheiro excede ${limitMb}MB.`);
  }

  const pathname = pickPathname(file);

  // Detecção de upload preso: se não progredir em 30s, aborta com mensagem útil.
  let lastProgressAt = Date.now();
  const stallChecker = setInterval(() => {
    if (Date.now() - lastProgressAt > 30_000) {
      clearInterval(stallChecker);
      console.error("[uploadMedia] stall detected", { pathname, size: file.size });
    }
  }, 5_000);

  try {
    const blob = await upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      onUploadProgress: (event) => {
        lastProgressAt = Date.now();
        if (onProgress) {
          onProgress({
            percent: Math.round(event.percentage),
            loaded: event.loaded,
            total: event.total,
          });
        }
      },
    });

    return blob.url;
  } catch (error) {
    console.error("[uploadMedia] error", error);
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("unauthorized") || msg.includes("401")) {
        throw new Error("Sessão expirou. Faz login novamente.");
      }
      if (msg.includes("network") || msg.includes("failed to fetch")) {
        throw new Error("Falha de rede. Verifica a ligação à internet.");
      }
      if (msg.includes("blob") || msg.includes("storage")) {
        throw new Error(`Erro no storage: ${error.message}`);
      }
      throw error;
    }
    throw new Error("Erro inesperado ao carregar.");
  } finally {
    clearInterval(stallChecker);
  }
}
