function parseNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getEnvironmentName() {
  return process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
}

export function getServerSentryOptions() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;

  return {
    dsn,
    enabled: Boolean(dsn),
    environment: getEnvironmentName(),
    tracesSampleRate: parseNumber(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.2),
    sendDefaultPii: true,
  };
}

export function getClientSentryOptions() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || undefined;

  return {
    dsn,
    enabled: Boolean(dsn),
    environment: getEnvironmentName(),
    tracesSampleRate: parseNumber(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0.1),
    replaysSessionSampleRate: parseNumber(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE, 0),
    replaysOnErrorSampleRate: parseNumber(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE, 1),
  };
}
