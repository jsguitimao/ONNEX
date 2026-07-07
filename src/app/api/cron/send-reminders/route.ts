import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/reminders";
import { captureException } from "@/lib/observability";

// Endpoint chamado por um cron externo (cron-job.org) de X em X minutos. Protegido
// por CRON_SECRET — aceita o segredo no header `Authorization: Bearer <secret>`
// (recomendado) ou em `?secret=<secret>`. Sempre dinâmico (nunca em cache).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// A BD Neon (plano free) adormece após inatividade; à hora do cron a primeira
// ligação pode falhar enquanto ela acorda ("Can't reach database server").
function isDbWakeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "PrismaClientInitializationError" ||
    error.message.includes("Can't reach database server")
  );
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const header = req.headers.get("authorization");
  if (header && header === `Bearer ${secret}`) return true;

  const fromQuery = new URL(req.url).searchParams.get("secret");
  return fromQuery === secret;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    let result;
    try {
      result = await sendDueReminders();
    } catch (error) {
      if (!isDbWakeError(error)) throw error;
      // Espera pelo acordar da BD e repete uma vez. O envio é idempotente
      // (dedupe em NotificationLog), por isso repetir é seguro.
      await new Promise((resolve) => setTimeout(resolve, 8000));
      result = await sendDueReminders();
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    captureException("cron.send_reminders.failed", error);
    return NextResponse.json({ error: "Erro ao processar lembretes." }, { status: 500 });
  }
}
