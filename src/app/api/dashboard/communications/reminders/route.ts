import { NextResponse } from "next/server";
import {
  autoCancelUnconfirmedBookings,
  logReminderRunExecution,
  sendConfirmationRequests,
  sendUpcomingBookingReminders,
} from "@/lib/notifications";
import { captureException } from "@/lib/observability";

export async function POST() {
  try {
    const [confirmationResult, cancelResult, reminderResult] = await Promise.all([
      sendConfirmationRequests(),
      autoCancelUnconfirmedBookings(),
      sendUpcomingBookingReminders(),
    ]);

    const totalSent = confirmationResult.sent + reminderResult.sent;
    const totalFailed = confirmationResult.failed + reminderResult.failed;
    const totalScanned = confirmationResult.scanned + cancelResult.scanned + reminderResult.scanned;
    const totalSkipped = confirmationResult.skipped + reminderResult.skipped;

    await logReminderRunExecution({
      source: "DASHBOARD",
      status: "SUCCESS",
      scanned: totalScanned,
      sent: totalSent,
      skipped: totalSkipped,
      failed: totalFailed,
    });

    return NextResponse.json({
      scanned: totalScanned,
      sent: totalSent,
      skipped: totalSkipped,
      failed: totalFailed,
      cancelled: cancelResult.cancelled,
      advancementsSent: cancelResult.advancementsSent,
    });
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
