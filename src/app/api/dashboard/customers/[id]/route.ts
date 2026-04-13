import { NextResponse } from "next/server";
import { z } from "zod";
import { updateCustomer } from "@/lib/business";

const customerSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(6).max(30).optional().or(z.literal("")),
  notes: z.string().max(400).optional().or(z.literal("")),
  marketingOptIn: z.boolean(),
});

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, { params }: RouteProps) {
  const { id } = await params;
  const body = await req.json();
  const result = customerSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? "Dados invalidos." }, { status: 400 });
  }

  try {
    const customer = await updateCustomer(id, {
      fullName: result.data.fullName,
      email: result.data.email || undefined,
      phone: result.data.phone || undefined,
      notes: result.data.notes || undefined,
      marketingOptIn: result.data.marketingOptIn,
    });

    return NextResponse.json(customer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    const status = message === "CUSTOMER_NOT_FOUND" ? 404 : 500;
    const mapped = status === 404 ? "Cliente não encontrado." : "Erro ao atualizar cliente.";
    return NextResponse.json({ error: mapped }, { status });
  }
}
