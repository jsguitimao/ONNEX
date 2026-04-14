import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { logReminderRunExecution, sendUpcomingBookingReminders } from "@/lib/notifications";
import { captureException, logWarning } from "@/lib/observability";

async function handleCronReminderRequest(req: Request) {
  const authorization = authorizeCronRequest(req);
  const userAgent = req.headers.get("user-agent");

  if (!authorization.configured) {
    await logReminderRunExecution({
      source: "CRON",
      status: "MISCONFIGURED",
      authorizationSource: authorization.source,
      userAgent,
      errorMessage: "CRON_SECRET_NOT_CONFIGURED",
    });
    logWarning("cron_send_reminders.secret_missing", {
      route: "/api/cron/send-reminders",
      isVercelCronUserAgent: authorization.isVercelCronUserAgent,
    });
    return NextResponse.json({ error: "CRON_SECRET não configurado." }, { status: 503 });
  }

  if (!authorization.ok) {
    await logReminderRunExecution({
      source: "CRON",
      status: "UNAUTHORIZED",
      authorizationSource: authorization.source,
      userAgent,
      errorMessage: "CRON_REQUEST_UNAUTHORIZED",
    });
    logWarning("cron_send_reminders.unauthorized", {
      route: "/api/cron/send-reminders",
      isVercelCronUserAgent: authorization.isVercelCronUserAgent,
    });
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const reminderStartMinutes = Number(searchParams.get("start") ?? 25);
    const reminderEndMinutes = Number(searchParams.get("end") ?? 35);

    const result = await sendUpcomingBookingReminders({
      reminderStartMinutes,
      reminderEndMinutes,
    });

    await logReminderRunExecution({
      source: "CRON",
      status: "SUCCESS",
      authorizationSource: authorization.source,
      userAgent,
      reminderStartMinutes,
      reminderEndMinutes,
      scanned: result.scanned,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
    });

    return NextResponse.json(result);
  } catch (error) {
    await logReminderRunExecution({
      source: "CRON",
      status: "FAILED",
      authorizationSource: authorization.source,
      userAgent,
      errorMessage: error instanceof Error ? error.message : "CRON_REMINDER_RUN_FAILED",
    });
    captureException("cron_send_reminders.failed", error, {
      route: "/api/cron/send-reminders",
      authorizationSource: authorization.source,
      isVercelCronUserAgent: authorization.isVercelCronUserAgent,
    });
    return NextResponse.json({ error: "Erro ao enviar lembretes." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handleCronReminderRequest(req);
}

export async function POST(req: Request) {
  return handleCronReminderRequest(req);
}
