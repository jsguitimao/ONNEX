import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteStaffMember, updateStaffMember } from "@/lib/business";
import { readJsonBody } from "@/lib/request-body";

const availabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
}).refine((slot) => slot.startTime < slot.endTime, {
  message: "A hora de início deve ser anterior à hora de fim.",
});

const teamSchema = z.object({
  fullName: z.string().min(2).max(80),
  roleTitle: z.string().max(80).optional(),
  bio: z.string().max(240).optional(),
  avatarUrl: z.string().url().or(z.literal("")).optional(),
  isActive: z.boolean(),
  autoAcceptBookings: z.boolean().optional(),
  serviceIds: z.array(z.string()).min(1),
  portfolioImages: z.array(z.string().url()).max(10).optional(),
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
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }

    const staffMember = await updateStaffMember(id, result.data);
    return NextResponse.json(staffMember);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    if (message === "STAFF_NOT_FOUND") {
      return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
    }
    if (message === "STAFF_SERVICE_INVALID") {
      return NextResponse.json({ error: "Escolhe apenas servicos deste negocio." }, { status: 400 });
    }
    const status = message === "INVALID_JSON_BODY" ? 400 : 500;
    const mapped = status === 400 ? "Corpo JSON inválido." : "Não foi possível atualizar o profissional.";
    return NextResponse.json({ error: mapped }, { status });
  }
}

export async function DELETE(_: Request, { params }: RouteProps) {
  const { id } = await params;

  try {
    await deleteStaffMember(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    const mapped =
      message === "STAFF_NOT_FOUND"
        ? { status: 404, error: "Profissional não encontrado." }
        : message === "STAFF_HAS_ACTIVE_BOOKINGS"
          ? { status: 409, error: "Este profissional tem reservas ativas e não pode ser eliminado." }
          : { status: 500, error: "Não foi possível eliminar o profissional." };

    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
