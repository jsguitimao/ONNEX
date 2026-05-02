export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif", "gif", "heic", "heif"] as const;
export const VIDEO_EXTENSIONS = ["mp4", "webm"] as const;

export type MediaKind = "image" | "video";

const IMAGE_PATTERN = buildExtensionPattern(IMAGE_EXTENSIONS);
const VIDEO_PATTERN = buildExtensionPattern(VIDEO_EXTENSIONS);

export function inferMediaKindFromUrl(url: string): MediaKind | null {
  const value = url.trim();
  if (!value) return null;
  if (value.startsWith("blob:")) return null;
  if (value.startsWith("data:image/")) return "image";
  if (value.startsWith("data:video/")) return "video";

  try {
    const parsed = new URL(value);
    const path = decodeURIComponent(parsed.pathname);
    if (VIDEO_PATTERN.test(path)) return "video";
    if (IMAGE_PATTERN.test(path)) return "image";
    return null;
  } catch {
    return null;
  }
}

export function isSupportedMediaUrl(url: string) {
  const value = url.trim();
  if (value.startsWith("blob:") || value.startsWith("data:image/") || value.startsWith("data:video/")) {
    return true;
  }
  return inferMediaKindFromUrl(value) !== null;
}

function buildExtensionPattern(extensions: readonly string[]) {
  return new RegExp(`\\.(${extensions.join("|")})(?:$|[?#-])`, "i");
}
