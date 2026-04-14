import { NextResponse } from "next/server";
import { z } from "zod";
import { updateStaffMember } from "@/lib/business";
import { readJsonBody } from "@/lib/request-body";

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

  try {
    const body = await readJsonBody(req);
    const result = teamSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Dados invalidos." }, { status: 400 });
    }

    const staffMember = await updateStaffMember(id, result.data);
    return NextResponse.json(staffMember);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    const status = message === "INVALID_JSON_BODY" ? 400 : 500;
    const mapped = status === 400 ? "Corpo JSON invalido." : "Nao foi possivel atualizar o profissional.";
    return NextResponse.json({ error: mapped }, { status });
  }
}
