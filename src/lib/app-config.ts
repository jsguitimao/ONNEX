const DEFAULT_APP_URL = "https://buk-next.vercel.app";

function normalizeUrl(value: string | undefined | null) {
  if (!value) {
    return DEFAULT_APP_URL;
  }

  return value.trim().replace(/\/+$/, "") || DEFAULT_APP_URL;
}

export function getAppUrl() {
  return normalizeUrl(process.env.NEXT_PUBLIC_APP_URL);
}

export function getEmailFrom() {
  return process.env.EMAIL_FROM?.trim() || process.env.RESEND_FROM_EMAIL?.trim() || "";
}

export function getCronSecret() {
  return process.env.CRON_SECRET?.trim() || "";
}

export function getEnvironmentName() {
  return process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV?.trim() || "development";
}

export function isProductionEnvironment() {
  return getEnvironmentName() === "production";
}
