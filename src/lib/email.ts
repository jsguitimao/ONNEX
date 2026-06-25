import { Resend } from "resend";

// Remetente. Tem de ser um endereço no domínio verificado no Resend (onnex.pt).
// Configurável por env para staging/testes; default para produção.
const DEFAULT_FROM = "Onnex <reservas@onnex.pt>";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; skipped: true; reason: "RESEND_NOT_CONFIGURED" }
  | { ok: false; skipped?: false; reason: string };

let cachedClient: Resend | null | undefined;

function getResendClient(): Resend | null {
  if (cachedClient !== undefined) return cachedClient;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  cachedClient = apiKey ? new Resend(apiKey) : null;
  return cachedClient;
}

/**
 * Envia um email via Resend. Não lança — devolve sempre um resultado para o
 * chamador registar no NotificationLog. Se a RESEND_API_KEY não estiver
 * configurada, devolve `skipped` (não é um erro: o canal está apenas inativo).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getResendClient();
  if (!client) {
    return { ok: false, skipped: true, reason: "RESEND_NOT_CONFIGURED" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: process.env.EMAIL_FROM?.trim() || DEFAULT_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    if (error) {
      return { ok: false, reason: error.message };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "EMAIL_SEND_FAILED" };
  }
}
