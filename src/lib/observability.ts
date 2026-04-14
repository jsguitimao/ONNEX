import * as Sentry from "@sentry/nextjs";

type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function writeLog(level: LogLevel, event: string, context: LogContext = {}) {
  const payload = JSON.stringify({
    scope: "bukbarbearia",
    event,
    level,
    timestamp: new Date().toISOString(),
    ...context,
  });

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}

export function logEvent(event: string, context?: LogContext) {
  Sentry.addBreadcrumb({
    category: "app",
    message: event,
    level: "info",
    data: context,
  });
  writeLog("info", event, context);
}

export function logWarning(event: string, context?: LogContext) {
  Sentry.addBreadcrumb({
    category: "app",
    message: event,
    level: "warning",
    data: context,
  });
  writeLog("warn", event, context);
}

export function captureException(event: string, error: unknown, context: LogContext = {}) {
  const normalizedError =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : {
          message: typeof error === "string" ? error : "Unknown error",
        };

  const enrichedContext = {
    ...context,
    error: normalizedError,
  };

  Sentry.withScope((scope) => {
    scope.setTag("app.event", event);
    for (const [key, value] of Object.entries(context)) {
      scope.setContext(key, {
        value: typeof value === "string" ? value : JSON.stringify(value),
      });
    }

    if (error instanceof Error) {
      Sentry.captureException(error);
      return;
    }

    Sentry.captureException(new Error(typeof error === "string" ? error : event));
  });

  writeLog("error", event, enrichedContext);
}
