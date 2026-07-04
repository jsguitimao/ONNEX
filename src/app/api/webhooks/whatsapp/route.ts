import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { captureException } from "@/lib/observability";

// Webhook de estados da WhatsApp Cloud API. A Meta chama:
//   - GET  : handshake de verificação (hub.challenge) ao configurar o webhook.
//   - POST : eventos de estado das mensagens (sent/delivered/read/failed).
// Guardamos o estado de ENTREGA no NotificationLog (campo errorMessage, prefixo
// "delivery:") para termos visibilidade real do que acontece a cada mensagem —
// sem isto, "SENT" (aceite pela Meta) não distingue entregue de falhado.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();

  if (mode === "subscribe" && expected && token === expected) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// Assinatura X-Hub-Signature-256 (HMAC com o App Secret). Se WHATSAPP_APP_SECRET
// não estiver definido, não bloqueia (o webhook só transporta estados de entrega).
function isValidSignature(raw: string, signature: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!secret) return true;
  if (!signature) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

type WhatsappStatus = {
  id?: string;
  status?: string;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
};

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  if (!isValidSignature(raw, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  try {
    const body = JSON.parse(raw) as {
      entry?: Array<{ changes?: Array<{ value?: { statuses?: WhatsappStatus[] } }> }>;
    };

    const statuses: WhatsappStatus[] =
      body.entry?.flatMap(
        (entry) => entry.changes?.flatMap((change) => change.value?.statuses ?? []) ?? [],
      ) ?? [];

    for (const st of statuses) {
      const wamid = st.id;
      const status = st.status; // sent | delivered | read | failed
      if (!wamid || !status) continue;

      const detail =
        status === "failed"
          ? `failed:${st.errors?.[0]?.title ?? st.errors?.[0]?.code ?? "unknown"}`
          : status;

      // Anota o estado de entrega SEM mexer no status principal (SENT), para não
      // interferir no dedupe nem provocar reenvios em loop de mensagens falhadas.
      await db.notificationLog.updateMany({
        where: { providerMessageId: wamid },
        data: { errorMessage: `delivery:${detail}` },
      });

      if (status === "failed") {
        captureException("whatsapp.delivery_failed", new Error(detail), { wamid });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    captureException("whatsapp.webhook_failed", error);
    // Devolve 200 na mesma para a Meta não repetir indefinidamente.
    return NextResponse.json({ ok: true });
  }
}
