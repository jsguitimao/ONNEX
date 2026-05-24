import * as Sentry from "@sentry/nextjs";
import { scrubPii } from "./scrub-pii";

type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function writeLog(level: LogLevel, event: string, context: LogContext = {}) {
  const payload = JSON.stringify({
    scope: "onnex",
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
  const safeContext = context ? scrubPii(context) : context;
  Sentry.addBreadcrumb({
    category: "app",
    message: event,
    level: "info",
    data: safeContext,
  });
  writeLog("info", event, safeContext);
}

export function logWarning(event: string, context?: LogContext) {
  const safeContext = context ? scrubPii(context) : context;
  Sentry.addBreadcrumb({
    category: "app",
    message: event,
    level: "warning",
    data: safeContext,
  });
  writeLog("warn", event, safeContext);
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

  // Scrub uma vez no merge: apanha tanto o `context` do chamador como a
  // `message`/`stack` do erro (que podem trazer telefone/email do provider).
  const safeContext = scrubPii(context);
  const enrichedContext = scrubPii({
    ...context,
    error: normalizedError,
  });

  Sentry.withScope((scope) => {
    scope.setTag("app.event", event);
    for (const [key, value] of Object.entries(safeContext)) {
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
