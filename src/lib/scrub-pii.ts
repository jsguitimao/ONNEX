// Rede de segurança final contra PII em telemetria (Sentry + logs estruturados).
//
// Dois mecanismos complementares:
//   1. Mascara por VALOR (regex) telefones E.164 e emails dentro de qualquer
//      string — apanha PII que vem em `message`, stacks ou texto livre.
//   2. Redige por CHAVE valores cujo nome de campo é sensível (tokens públicos,
//      idempotency keys, segredos, authorization) — esses não têm formato
//      reconhecível, por isso filtramos pelo nome.
//
// IDs de domínio (bookingId, businessId) são intencionalmente PRESERVADOS:
// não são PII e são essenciais para triagem. Por isso a heurística de chave
// nunca usa "id".

export const PHONE_MASK = "[redacted-phone]";
export const EMAIL_MASK = "[redacted-email]";
export const VALUE_MASK = "[redacted]";
export const CIRCULAR_MASK = "[Circular]";

// E.164: "+" seguido de 8 a 15 dígitos (o primeiro 1-9). O lookahead `(?!\d)`
// impede apanhar só parte de uma sequência maior de dígitos.
const PHONE_PATTERN = /\+[1-9]\d{7,14}(?!\d)/g;
// Telefone em formato LOCAL (sem "+"), tal como o cliente o introduz e como
// aparece em mensagens de erro do provider (ex.: "924057914"). Apanha sequências
// de 9 a 15 dígitos isoladas (lookbehind/lookahead impedem cortar IDs ou apanhar
// só parte de um número maior). Compromisso conhecido: timestamps em ms (13
// dígitos) também são mascarados — aceitável para garantir privacidade.
const LOCAL_PHONE_PATTERN = /(?<!\d)\d{9,15}(?!\d)/g;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// Combina parcial e case-insensitive: "publicToken", "idempotencyKey",
// "authorization", "apiKey"... NÃO inclui "id" para não apanhar bookingId/businessId.
// Telefones/emails NÃO entram aqui de propósito: são mascarados por VALOR (acima),
// o que dá máscaras tipadas ([redacted-phone]/[redacted-email]) mais úteis na triagem.
const SENSITIVE_KEY_PATTERN = /(token|idempotenc|secret|password|authorization|api[-_]?key)/i;

export function scrubString(value: string): string {
  return value
    .replace(PHONE_PATTERN, PHONE_MASK)
    .replace(EMAIL_PATTERN, EMAIL_MASK)
    .replace(LOCAL_PHONE_PATTERN, PHONE_MASK);
}

function scrubValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") {
    return scrubString(value);
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  // Datas não têm PII e não são para percorrer chave a chave.
  if (value instanceof Date) {
    return value;
  }

  // Ciclos: devolve a referência tal como está para não entrar em loop infinito.
  if (seen.has(value)) {
    return CIRCULAR_MASK;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, seen));
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY_PATTERN.test(key) ? VALUE_MASK : scrubValue(val, seen);
  }
  return out;
}

// Cópia profunda com PII mascarada, preservando o tipo de entrada.
export function scrubPii<T>(value: T): T {
  return scrubValue(value, new WeakSet()) as T;
}
