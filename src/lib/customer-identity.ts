export function normalizeCustomerName(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || "Cliente";
}

export function normalizeCustomerEmail(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

// E.164: '+' seguido de 7-15 digitos. Aceita qualquer pais.
// Se o input nao tem '+', assumimos Portugal (+351) como default — cobre a
// maioria dos clientes. Estrangeiros tem de incluir o seu prefixo (+34, +33, etc).
export function normalizeCustomerPhone(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const hasPlusPrefix = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) return null;

  const normalized = hasPlusPrefix ? `+${digits}` : `+351${digits}`;

  // E.164 valido: + + 7-15 digitos
  if (!/^\+\d{7,15}$/.test(normalized)) return null;

  return normalized;
}

export function sanitizeBookingCustomerInput(input: {
  fullName: string;
  email?: string | null;
  phone?: string | null;
}) {
  return {
    fullName: normalizeCustomerName(input.fullName),
    email: normalizeCustomerEmail(input.email),
    phone: normalizeCustomerPhone(input.phone),
  };
}
