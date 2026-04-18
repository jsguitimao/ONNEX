import { NextResponse } from "next/server";
import { logReminderRunExecution, sendUpcomingBookingReminders } from "@/lib/notifications";
import { captureException } from "@/lib/observability";

export async function POST() {
  try {
    const result = await sendUpcomingBookingReminders({
      reminderStartMinutes: 25,
      reminderEndMinutes: 35,
    });

    await logReminderRunExecution({
      source: "DASHBOARD",
      status: "SUCCESS",
      reminderStartMinutes: result.reminderStartMinutes,
      reminderEndMinutes: result.reminderEndMinutes,
      scanned: result.scanned,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
    });

    return NextResponse.json(result);
  } catch (error) {
    await logReminderRunExecution({
      source: "DASHBOARD",
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : "DASHBOARD_REMINDER_RUN_FAILED",
    });
    captureException("dashboard_communications.run_reminders_failed", error);
    return NextResponse.json(
      { error: "Não foi possível executar a varredura de lembretes." },
      { status: 500 }
    );
  }
}
