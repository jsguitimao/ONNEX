import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/reminders";
import { captureException } from "@/lib/observability";

// Endpoint chamado por um cron externo (cron-job.org) de X em X minutos. Protegido
// por CRON_SECRET — aceita o segredo no header `Authorization: Bearer <secret>`
// (recomendado) ou em `?secret=<secret>`. Sempre dinâmico (nunca em cache).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const result = await sendDueReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    captureException("cron.send_reminders.failed", error);
    return NextResponse.json({ error: "Erro ao processar lembretes." }, { status: 500 });
  }
}
