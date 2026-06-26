// Motor de envio de WhatsApp via Cloud API oficial da Meta (Graph API).
// Envia mensagens de TEMPLATE (confirmação / lembrete), que são o tipo permitido
// para mensagens iniciadas pelo negócio. Tolerante: se não houver token ou
// phone_number_id, devolve `skipped` (não é erro — o canal está apenas inativo),
// para o chamador registar no NotificationLog sem partir o fluxo da reserva.

const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION?.trim() || "v21.0";
const DEFAULT_LANGUAGE = "pt_PT";

type SendTemplateInput = {
  /** ID do número da barbearia na Cloud API (vem da ligação à Meta, por business). */
  phoneNumberId: string;
  /** Destinatário em E.164 (ex.: +351912345678). */
  to: string;
  /** Nome do template aprovado na Meta (ex.: "reserva_confirmada"). */
  template: string;
  /** Variáveis do corpo do template, por ordem ({{1}}, {{2}}, ...). */
  variables?: string[];
  languageCode?: string;
};

export type WhatsappSendResult =
  | { ok: true; id: string | null }
  | { ok: false; skipped: true; reason: "WHATSAPP_NOT_CONFIGURED" }
  | { ok: false; skipped?: false; reason: string };

function getAccessToken(): string | null {
  return process.env.WHATSAPP_ACCESS_TOKEN?.trim() || null;
}

export async function sendWhatsappTemplate(
  input: SendTemplateInput,
): Promise<WhatsappSendResult> {
  const token = getAccessToken();
  if (!token || !input.phoneNumberId) {
    return { ok: false, skipped: true, reason: "WHATSAPP_NOT_CONFIGURED" };
  }

  const components =
    input.variables && input.variables.length > 0
      ? [
          {
            type: "body",
            parameters: input.variables.map((text) => ({ type: "text", text })),
          },
        ]
      : undefined;

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${input.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: input.to,
          type: "template",
          template: {
            name: input.template,
            language: { code: input.languageCode || DEFAULT_LANGUAGE },
            ...(components ? { components } : {}),
          },
        }),
      },
    );

    const data = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      messages?: Array<{ id?: string }>;
    };

    if (!response.ok) {
      return {
        ok: false,
        reason: data.error?.message || `WHATSAPP_SEND_FAILED_${response.status}`,
      };
    }

    return { ok: true, id: data.messages?.[0]?.id ?? null };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "WHATSAPP_SEND_FAILED",
    };
  }
}
