import { timingSafeEqual } from "node:crypto";

export type CronAuthorizationResult = {
  ok: boolean;
  configured: boolean;
  source: "header" | "bearer" | null;
  isVercelCronUserAgent: boolean;
};

function secureEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function authorizeCronRequest(request: Request): CronAuthorizationResult {
  const secret = process.env.CRON_SECRET?.trim() || "";
  const headerToken = request.headers.get("x-cron-secret")?.trim() || "";
  const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  const userAgent = request.headers.get("user-agent") || "";
  const configured = secret.length > 0;

  if (!configured) {
    return {
      ok: false,
      configured: false,
      source: null,
      isVercelCronUserAgent: /vercel-cron/i.test(userAgent),
    };
  }

  if (headerToken && secureEquals(headerToken, secret)) {
    return {
      ok: true,
      configured: true,
      source: "header",
      isVercelCronUserAgent: /vercel-cron/i.test(userAgent),
    };
  }

  if (bearerToken && secureEquals(bearerToken, secret)) {
    return {
      ok: true,
      configured: true,
      source: "bearer",
      isVercelCronUserAgent: /vercel-cron/i.test(userAgent),
    };
  }

  return {
    ok: false,
    configured: true,
    source: null,
    isVercelCronUserAgent: /vercel-cron/i.test(userAgent),
  };
}
