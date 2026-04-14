import { NextResponse } from "next/server";
import { sendUpcomingBookingReminders } from "@/lib/notifications";
import { captureException } from "@/lib/observability";

export async function POST() {
  try {
    const result = await sendUpcomingBookingReminders({
      reminderStartMinutes: 25,
      reminderEndMinutes: 35,
    });

    return NextResponse.json(result);
  } catch (error) {
    captureException("dashboard_communications.run_reminders_failed", error);
    return NextResponse.json(
      { error: "Nao foi possivel executar a varredura de lembretes." },
      { status: 500 }
    );
  }
}
