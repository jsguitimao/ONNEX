export function normalizeCustomerName(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || "Cliente";
}

export function normalizeCustomerEmail(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

export function normalizeCustomerPhone(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const hasPlusPrefix = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) return null;

  return `${hasPlusPrefix ? "+" : ""}${digits}`;
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
