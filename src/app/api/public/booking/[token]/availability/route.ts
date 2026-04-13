import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicBookingRescheduleSlots } from "@/lib/business";

const schema = z.object({
  date: z.string().min(1),
});

type RouteProps = {
  params: Promise<{ token: string }>;
};

export async function GET(req: Request, { params }: RouteProps) {
  const { token } = await params;
  const url = new URL(req.url);
  const result = schema.safeParse({
    date: url.searchParams.get("date"),
  });

  if (!result.success) {
    return NextResponse.json({ error: "Parametros invalidos." }, { status: 400 });
  }

  const slots = await getPublicBookingRescheduleSlots(token, result.data.date);

  if (!slots) {
    return NextResponse.json({ error: "Reserva não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ slots });
}
