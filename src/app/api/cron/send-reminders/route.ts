import { NextResponse } from "next/server";
import { sendUpcomingBookingReminders } from "@/lib/notifications";

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const headerToken = req.headers.get("x-cron-secret");
  const bearerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const urlToken = new URL(req.url).searchParams.get("secret");

  return [headerToken, bearerToken, urlToken].some((value) => value === secret);
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
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

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST send reminders error:", error);
    return NextResponse.json({ error: "Erro ao enviar lembretes." }, { status: 500 });
  }
}
