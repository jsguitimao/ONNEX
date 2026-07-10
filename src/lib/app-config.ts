const DEFAULT_APP_URL = "https://www.onnex.pt";

function normalizeUrl(value: string | undefined | null) {
  if (!value) {
    return DEFAULT_APP_URL;
  }

  return value.trim().replace(/\/+$/, "") || DEFAULT_APP_URL;
}

export function getAppUrl() {
  return normalizeUrl(process.env.NEXT_PUBLIC_APP_URL);
}

export function getEnvironmentName() {
  return process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV?.trim() || "development";
}
