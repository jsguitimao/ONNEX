import { NextResponse } from "next/server";
import { getBookingAgenda } from "@/lib/business";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ?? undefined;
    const staffMemberId = searchParams.get("staffMemberId") ?? undefined;

    const snapshot = await getBookingAgenda({ date, staffMemberId });
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("GET bookings agenda error:", error);
    return NextResponse.json({ error: "Erro ao carregar a agenda." }, { status: 500 });
  }
}
