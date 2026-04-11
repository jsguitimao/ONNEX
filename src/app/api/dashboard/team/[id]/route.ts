import { NextResponse } from "next/server";
import { z } from "zod";
import { updateStaffMember } from "@/lib/business";

const availabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const teamSchema = z.object({
  fullName: z.string().min(2).max(80),
  roleTitle: z.string().max(80).optional(),
  bio: z.string().max(240).optional(),
  isActive: z.boolean(),
  serviceIds: z.array(z.string()).min(1),
  availability: z.array(availabilitySchema).min(1),
});

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, { params }: RouteProps) {
  const { id } = await params;
  const body = await req.json();
  const result = teamSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const staffMember = await updateStaffMember(id, result.data);
  return NextResponse.json(staffMember);
}
