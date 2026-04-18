import { NextResponse } from "next/server";
import { updateAutoAcceptBookings } from "@/lib/business";

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as { autoAcceptBookings?: boolean };

    if (typeof body.autoAcceptBookings === "boolean") {
      await updateAutoAcceptBookings(body.autoAcceptBookings);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH settings error:", error);
    return NextResponse.json({ error: "Erro ao guardar definições." }, { status: 500 });
  }
}
