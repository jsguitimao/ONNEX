import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableSlots } from "@/lib/business";

const schema = z.object({
  serviceId: z.string().min(1),
  staffMemberId: z.string().min(1),
  date: z.string().min(1),
});

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(req: Request, { params }: RouteProps) {
  const { slug } = await params;
  const url = new URL(req.url);
  const result = schema.safeParse({
    serviceId: url.searchParams.get("serviceId"),
    staffMemberId: url.searchParams.get("staffMemberId"),
    date: url.searchParams.get("date"),
  });

  if (!result.success) {
    return NextResponse.json({ error: "Parametros invalidos." }, { status: 400 });
  }

  const slots = await getAvailableSlots({
    slug,
    ...result.data,
  });

  return NextResponse.json({ slots });
}
