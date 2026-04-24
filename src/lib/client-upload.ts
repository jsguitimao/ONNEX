"use client";

import { upload } from "@vercel/blob/client";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v", "qt"];

function isVideo(file: File) {
  if ((file.type || "").toLowerCase().startsWith("video/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTENSIONS.includes(ext);
}

function pickPathname(file: File) {
  const fallbackExt = isVideo(file) ? "mp4" : "jpg";
  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? fallbackExt;
  const safeExt = /^[a-z0-9]{2,5}$/.test(rawExt) ? rawExt : fallbackExt;
  return `media/${Date.now()}.${safeExt}`;
}

export async function uploadMedia(file: File): Promise<string> {
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

  const blob = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
  });

  return blob.url;
}
