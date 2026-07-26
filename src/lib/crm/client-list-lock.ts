import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

// Código de segurança com que o PRIMEIRO profissional da equipa protege a sua
// lista de clientes na secção de agendamento. Guardado como scrypt "salt:hashHex"
// na coluna StaffMember.clientListLockHash do primeiro profissional.
//
// Nota de âmbito: hoje o CRM corre sob um único login (o dono). Este cadeado é uma
// barreira ao nível da aplicação (o servidor nem sequer envia a lista para o
// browser sem o código) para impedir que outros membros da equipa que partilhem o
// ecrã/sessão vejam os clientes do primeiro profissional. Não é um mecanismo de
// autenticação por profissional.

const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 8;
const SCRYPT_KEYLEN = 32;

export type CrmClientListLockErrorCode =
  | "NO_FIRST_STAFF"
  | "INVALID_PIN"
  | "NOT_ENABLED"
  | "ALREADY_ENABLED"
  | "WRONG_PIN"
  | "RESET_NOT_REQUESTED"
  | "RESET_EXPIRED"
  | "RESET_WRONG_CODE";

const RESET_CODE_TTL_MS = 15 * 60 * 1000;

export class CrmClientListLockError extends Error {
  constructor(
    public code: CrmClientListLockErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export type ClientListLockState = {
  firstStaffId: string | null;
  firstStaffName: string | null;
  enabled: boolean;
};

/** Normaliza e valida um código: apenas dígitos, entre 4 e 8. */
function normalizePin(pin: unknown): string {
  const value = typeof pin === "string" ? pin.trim() : "";
  if (!/^\d+$/.test(value) || value.length < PIN_MIN_LENGTH || value.length > PIN_MAX_LENGTH) {
    throw new CrmClientListLockError(
      "INVALID_PIN",
      `O código tem de ter entre ${PIN_MIN_LENGTH} e ${PIN_MAX_LENGTH} dígitos.`,
    );
  }
  return value;
}

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(pin, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPinAgainstHash(pin: string, stored: string): boolean {
  const [salt, derivedHex] = stored.split(":");
  if (!salt || !derivedHex) return false;
  const expected = Buffer.from(derivedHex, "hex");
  const actual = scryptSync(pin, salt, expected.length);
  // timingSafeEqual exige buffers do mesmo tamanho.
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** Primeiro profissional ativo da equipa (o mesmo critério de ordenação do CRM). */
async function getFirstStaff(businessId: string) {
  return db.staffMember.findFirst({
    where: { businessId, isActive: true, deletedAt: null },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, fullName: true, clientListLockHash: true },
  });
}

export async function getClientListLockState(businessId: string): Promise<ClientListLockState> {
  const first = await getFirstStaff(businessId);
  return {
    firstStaffId: first?.id ?? null,
    firstStaffName: first?.fullName ?? null,
    enabled: Boolean(first?.clientListLockHash),
  };
}

export async function setClientListLock(businessId: string, pin: unknown): Promise<void> {
  const first = await getFirstStaff(businessId);
  if (!first) {
    throw new CrmClientListLockError("NO_FIRST_STAFF", "Não há profissional na equipa.");
  }
  if (first.clientListLockHash) {
    throw new CrmClientListLockError("ALREADY_ENABLED", "A lista já está protegida.");
  }
  const normalized = normalizePin(pin);
  await db.staffMember.update({
    where: { id: first.id },
    data: { clientListLockHash: hashPin(normalized) },
  });
}

export async function changeClientListLock(
  businessId: string,
  currentPin: unknown,
  newPin: unknown,
): Promise<void> {
  const first = await getFirstStaff(businessId);
  if (!first) {
    throw new CrmClientListLockError("NO_FIRST_STAFF", "Não há profissional na equipa.");
  }
  if (!first.clientListLockHash) {
    throw new CrmClientListLockError("NOT_ENABLED", "A lista não está protegida.");
  }
  const current = normalizePin(currentPin);
  if (!verifyPinAgainstHash(current, first.clientListLockHash)) {
    throw new CrmClientListLockError("WRONG_PIN", "Código atual incorreto.");
  }
  const next = normalizePin(newPin);
  await db.staffMember.update({
    where: { id: first.id },
    data: { clientListLockHash: hashPin(next) },
  });
}

export async function removeClientListLock(businessId: string, currentPin: unknown): Promise<void> {
  const first = await getFirstStaff(businessId);
  if (!first) {
    throw new CrmClientListLockError("NO_FIRST_STAFF", "Não há profissional na equipa.");
  }
  if (!first.clientListLockHash) {
    throw new CrmClientListLockError("NOT_ENABLED", "A lista não está protegida.");
  }
  const current = normalizePin(currentPin);
  if (!verifyPinAgainstHash(current, first.clientListLockHash)) {
    throw new CrmClientListLockError("WRONG_PIN", "Código atual incorreto.");
  }
  await db.staffMember.update({
    where: { id: first.id },
    data: { clientListLockHash: null },
  });
}

/**
 * Recuperação por email (secção Conta): gera um código de uso único, guarda-o
 * (hash + validade) no primeiro profissional e devolve-o em claro para o chamador
 * o enviar por email. Só faz sentido se houver proteção ativa.
 */
export async function requestClientListLockReset(businessId: string): Promise<string> {
  const first = await getFirstStaff(businessId);
  if (!first) {
    throw new CrmClientListLockError("NO_FIRST_STAFF", "Não há profissional na equipa.");
  }
  if (!first.clientListLockHash) {
    throw new CrmClientListLockError("NOT_ENABLED", "A lista não está protegida.");
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.staffMember.update({
    where: { id: first.id },
    data: {
      clientListLockResetCodeHash: hashPin(code),
      clientListLockResetExpiresAt: new Date(Date.now() + RESET_CODE_TTL_MS),
    },
  });
  return code;
}

/**
 * Confirma o código de recuperação enviado por email: se válido e dentro da
 * validade, REMOVE a proteção (o dono define depois um novo código nas secções).
 */
export async function confirmClientListLockReset(businessId: string, code: unknown): Promise<void> {
  const first = await db.staffMember.findFirst({
    where: { businessId, isActive: true, deletedAt: null },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      clientListLockResetCodeHash: true,
      clientListLockResetExpiresAt: true,
    },
  });
  if (!first) {
    throw new CrmClientListLockError("NO_FIRST_STAFF", "Não há profissional na equipa.");
  }
  if (!first.clientListLockResetCodeHash || !first.clientListLockResetExpiresAt) {
    throw new CrmClientListLockError("RESET_NOT_REQUESTED", "Não há pedido de recuperação ativo.");
  }
  if (first.clientListLockResetExpiresAt.getTime() < Date.now()) {
    // Limpa o código expirado para não deixar lixo.
    await db.staffMember.update({
      where: { id: first.id },
      data: { clientListLockResetCodeHash: null, clientListLockResetExpiresAt: null },
    });
    throw new CrmClientListLockError("RESET_EXPIRED", "O código expirou. Pede um novo.");
  }
  const value = typeof code === "string" ? code.trim() : "";
  if (!/^\d{6}$/.test(value) || !verifyPinAgainstHash(value, first.clientListLockResetCodeHash)) {
    throw new CrmClientListLockError("RESET_WRONG_CODE", "Código incorreto.");
  }
  // Remove a proteção e o pedido de recuperação.
  await db.staffMember.update({
    where: { id: first.id },
    data: {
      clientListLockHash: null,
      clientListLockResetCodeHash: null,
      clientListLockResetExpiresAt: null,
    },
  });
}

/** Confirma o código. Devolve o id do primeiro profissional quando correto. */
export async function verifyClientListLock(businessId: string, pin: unknown): Promise<string> {
  const first = await getFirstStaff(businessId);
  if (!first) {
    throw new CrmClientListLockError("NO_FIRST_STAFF", "Não há profissional na equipa.");
  }
  if (!first.clientListLockHash) {
    throw new CrmClientListLockError("NOT_ENABLED", "A lista não está protegida.");
  }
  const normalized = normalizePin(pin);
  if (!verifyPinAgainstHash(normalized, first.clientListLockHash)) {
    throw new CrmClientListLockError("WRONG_PIN", "Código incorreto.");
  }
  return first.id;
}
