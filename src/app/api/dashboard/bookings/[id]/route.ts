import { NextResponse } from "next/server";
import { z } from "zod";
import { updateBookingStatus } from "@/lib/business";

const bookingSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
});

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, { params }: RouteProps) {
  const { id } = await params;
  const body = await req.json();
  const result = bookingSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? "Dados invalidos." }, { status: 400 });
  }

  const booking = await updateBookingStatus(id, result.data.status);
  return NextResponse.json(booking);
}
