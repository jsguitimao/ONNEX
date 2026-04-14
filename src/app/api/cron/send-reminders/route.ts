import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { sendUpcomingBookingReminders } from "@/lib/notifications";
import { captureException, logWarning } from "@/lib/observability";

export async function POST(req: Request) {
  const authorization = authorizeCronRequest(req);

  if (!authorization.configured) {
    logWarning("cron_send_reminders.secret_missing", {
      route: "/api/cron/send-reminders",
      isVercelCronUserAgent: authorization.isVercelCronUserAgent,
    });
    return NextResponse.json({ error: "CRON_SECRET nao configurado." }, { status: 503 });
  }

  if (!authorization.ok) {
    logWarning("cron_send_reminders.unauthorized", {
      route: "/api/cron/send-reminders",
      isVercelCronUserAgent: authorization.isVercelCronUserAgent,
    });
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const reminderStartMinutes = Number(searchParams.get("start") ?? 25);
    const reminderEndMinutes = Number(searchParams.get("end") ?? 35);

    const result = await sendUpcomingBookingReminders({
      reminderStartMinutes,
      reminderEndMinutes,
    });

    return NextResponse.json(result);
  } catch (error) {
    captureException("cron_send_reminders.failed", error, {
      route: "/api/cron/send-reminders",
      authorizationSource: authorization.source,
      isVercelCronUserAgent: authorization.isVercelCronUserAgent,
    });
    return NextResponse.json({ error: "Erro ao enviar lembretes." }, { status: 500 });
  }
}
