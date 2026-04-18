import { NextResponse } from "next/server";
import { retryCommunicationNotification } from "@/lib/business";
import { captureException } from "@/lib/observability";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteProps) {
  const { id } = await params;

  try {
    const result = await retryCommunicationNotification(id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO";
    const status = message === "NOTIFICATION_NOT_FOUND" ? 404 : 500;
    const mapped =
      status === 404 ? "Registo de comunicação não encontrado." : "Não foi possível repetir a entrega.";

    captureException("dashboard_communications.retry_failed", error, { notificationId: id });

    return NextResponse.json({ error: mapped }, { status });
  }
}
