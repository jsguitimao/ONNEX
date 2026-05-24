// Keep next/image optimization enabled only for hosts that are known to be
// allowed by next.config.ts. Public pages can contain arbitrary user-provided
// HTTPS image URLs, and the optimizer returns 400 for hosts outside
// images.remotePatterns. Unknown hosts stay unoptimized to preserve behavior.
const OPTIMIZABLE_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export function canOptimizeImageUrl(src: string): boolean {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return url.hostname.endsWith(OPTIMIZABLE_HOST_SUFFIX);
}
