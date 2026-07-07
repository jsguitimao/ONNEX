import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDueReminders } from "@/lib/reminders";
import { captureException, logWarning } from "@/lib/observability";

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

// Acorda a BD com um SELECT 1 paciente antes de fazer trabalho a sério.
// O cold start da Neon pode levar dezenas de segundos; tentamos até ~30s.
async function warmUpDatabase(): Promise<number> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      await db.$queryRaw`SELECT 1`;
      return attempt;
    } catch (error) {
      if (!isDbWakeError(error)) throw error;
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  throw lastError;
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
    const warmupAttempts = await warmUpDatabase();
    if (warmupAttempts > 1) {
      logWarning("cron.send_reminders.db_cold_start", { warmupAttempts });
    }

    let result;
    try {
      result = await sendDueReminders();
    } catch (error) {
      if (!isDbWakeError(error)) throw error;
      // Última rede de segurança: repete uma vez. O envio é idempotente
      // (dedupe em NotificationLog), por isso repetir é seguro.
      await new Promise((resolve) => setTimeout(resolve, 8000));
      result = await sendDueReminders();
    }
    return NextResponse.json({ ok: true, warmupAttempts, ...result });
  } catch (error) {
    captureException("cron.send_reminders.failed", error);
    return NextResponse.json({ error: "Erro ao processar lembretes." }, { status: 500 });
  }
}
