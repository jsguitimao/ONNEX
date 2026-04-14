type OriginValidationResult = {
  ok: boolean;
  reason: "ORIGIN_NOT_ALLOWED" | "REFERER_NOT_ALLOWED" | "FETCH_SITE_NOT_ALLOWED" | null;
};

const DEFAULT_APP_URL = "https://buk-next.vercel.app";

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getConfiguredAppOrigin() {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") || DEFAULT_APP_URL;
  return normalizeOrigin(value);
}

function getForwardedOrigin(request: Request) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    new URL(request.url).host;
  const proto =
    request.headers.get("x-forwarded-proto") ||
    new URL(request.url).protocol.replace(":", "");

  if (!host || !proto) {
    return null;
  }

  return `${proto}://${host}`;
}

export function validatePublicMutationOrigin(request: Request): OriginValidationResult {
  const requestOrigin = new URL(request.url).origin;
  const forwardedOrigin = normalizeOrigin(getForwardedOrigin(request));
  const configuredOrigin = getConfiguredAppOrigin();
  const origin = normalizeOrigin(request.headers.get("origin"));
  const refererOrigin = normalizeOrigin(request.headers.get("referer"));
  const fetchSite = request.headers.get("sec-fetch-site");

  const allowedOrigins = new Set(
    [requestOrigin, forwardedOrigin, configuredOrigin].filter(
      (value): value is string => typeof value === "string" && value.length > 0
    )
  );

  if (origin && !allowedOrigins.has(origin)) {
    return {
      ok: false,
      reason: "ORIGIN_NOT_ALLOWED",
    };
  }

  if (!origin && refererOrigin && !allowedOrigins.has(refererOrigin)) {
    return {
      ok: false,
      reason: "REFERER_NOT_ALLOWED",
    };
  }

  if (!origin && !refererOrigin && fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    return {
      ok: false,
      reason: "FETCH_SITE_NOT_ALLOWED",
    };
  }

  return {
    ok: true,
    reason: null,
  };
}
