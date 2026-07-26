"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentBusiness } from "@/lib/business-modules/core";
import {
  CrmCustomerError,
  createCustomer,
  deleteCustomer,
  listCustomers,
  toCrmCustomerRowDto,
  updateCustomer,
  type CrmCustomerRowDto,
} from "@/lib/crm/customers";
import { createCustomerSchema } from "@/lib/crm/schema";
import { CrmStaffError, setStaffAutoAccept, type CrmStaffRow } from "@/lib/crm/staff";
import {
  CrmBookingError,
  acceptPendingBooking,
  cancelConfirmedBooking,
  completeConfirmedBooking,
  listDailyBookings,
  listPendingBookings,
  listWeeklyBookings,
  markBookingNoShow,
  rejectPendingBooking,
  toCrmBookingRowDto,
  toCrmPendingBookingDto,
  type CrmBookingRowDto,
  type CrmPendingBookingDto,
} from "@/lib/crm/bookings";
import {
  CrmClientListLockError,
  changeClientListLock,
  confirmClientListLockReset,
  getClientListLockState,
  removeClientListLock,
  requestClientListLockReset,
  setClientListLock,
  verifyClientListLock,
} from "@/lib/crm/client-list-lock";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  CrmAvailabilityError,
  countFutureBookingsOutsideShifts,
  setStaffDayAvailability,
  type CrmDayAvailability,
  type CrmShift,
} from "@/lib/crm/availability";
import {
  CrmScheduleBlockError,
  createScheduleBlock,
  deleteScheduleBlock,
  toCrmScheduleBlockRowDto,
  type CrmScheduleBlockInput,
  type CrmScheduleBlockKind,
  type CrmScheduleBlockRowDto,
} from "@/lib/crm/schedule-blocks";
import {
  computeFinancialSummary,
  type CrmFinancePeriod,
  type CrmFinancialSummary,
} from "@/lib/crm/finance";
import { sendBookingNotification } from "@/lib/notifications";
import {
  CrmManualBookingError,
  createManualBooking,
  type CrmManualBookingInput,
} from "@/lib/crm/manual-booking";
import { captureException } from "@/lib/observability";
import { consumeRateLimit } from "@/lib/rate-limit";

type CustomerFieldKey = "fullName" | "email" | "phone" | "notes";

export type CreateCustomerActionResult =
  | { ok: true; customer: CrmCustomerRowDto }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<CustomerFieldKey, string>>;
    };

export async function createCustomerAction(
  input: unknown,
): Promise<CreateCustomerActionResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
  }

  const rateLimit = await consumeRateLimit({
    namespace: "crm-create-customer",
    identifier: userId,
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiadas tentativas. Aguarda um momento." };
  }

  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<CustomerFieldKey, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "fullName" || key === "email" || key === "phone" || key === "notes") {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      fieldErrors,
    };
  }

  try {
    const business = await getCurrentBusiness();
    const customer = await createCustomer(business.id, parsed.data);
    revalidatePath("/crm");
    return { ok: true, customer: toCrmCustomerRowDto(customer) };
  } catch (error) {
    if (error instanceof CrmCustomerError) {
      const field: CustomerFieldKey = error.code === "DUPLICATE_EMAIL" ? "email" : "phone";
      return {
        ok: false,
        error: error.message,
        fieldErrors: { [field]: error.message },
      };
    }
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
    }
    captureException("crm.create_customer.failed", error, { userId });
    return { ok: false, error: "Erro ao criar cliente. Tenta novamente." };
  }
}

export type UpdateCustomerActionResult =
  | { ok: true; customer: CrmCustomerRowDto }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<CustomerFieldKey, string>>;
    };

export async function updateCustomerAction(
  customerId: unknown,
  input: unknown,
): Promise<UpdateCustomerActionResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
  }

  if (typeof customerId !== "string" || customerId.trim() === "") {
    return { ok: false, error: "Identificador inválido." };
  }

  const rateLimit = await consumeRateLimit({
    namespace: "crm-update-customer",
    identifier: userId,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiadas tentativas. Aguarda um momento." };
  }

  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<CustomerFieldKey, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "fullName" || key === "email" || key === "phone" || key === "notes") {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      fieldErrors,
    };
  }

  try {
    const business = await getCurrentBusiness();
    const customer = await updateCustomer(business.id, customerId, parsed.data);
    revalidatePath("/crm");
    return { ok: true, customer: toCrmCustomerRowDto(customer) };
  } catch (error) {
    if (error instanceof CrmCustomerError) {
      if (error.code === "DUPLICATE_EMAIL") {
        return { ok: false, error: error.message, fieldErrors: { email: error.message } };
      }
      if (error.code === "DUPLICATE_PHONE") {
        return { ok: false, error: error.message, fieldErrors: { phone: error.message } };
      }
      return { ok: false, error: error.message };
    }
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
    }
    captureException("crm.update_customer.failed", error, { userId, customerId });
    return { ok: false, error: "Erro ao guardar cliente. Tenta novamente." };
  }
}

export type DeleteCustomerActionResult =
  | { ok: true; customerId: string }
  | { ok: false; error: string };

export async function deleteCustomerAction(
  customerId: unknown,
): Promise<DeleteCustomerActionResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
  }

  if (typeof customerId !== "string" || customerId.trim() === "") {
    return { ok: false, error: "Identificador inválido." };
  }

  const rateLimit = await consumeRateLimit({
    namespace: "crm-delete-customer",
    identifier: userId,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiadas tentativas. Aguarda um momento." };
  }

  try {
    const business = await getCurrentBusiness();
    await deleteCustomer(business.id, customerId);
    revalidatePath("/crm");
    return { ok: true, customerId };
  } catch (error) {
    if (error instanceof CrmCustomerError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
    }
    captureException("crm.delete_customer.failed", error, { userId, customerId });
    return { ok: false, error: "Erro ao excluir cliente. Tenta novamente." };
  }
}

export type UpdateStaffAutoAcceptResult =
  | { ok: true; staff: CrmStaffRow }
  | { ok: false; error: string };

export async function updateStaffAutoAcceptAction(
  staffId: unknown,
  autoAccept: unknown,
): Promise<UpdateStaffAutoAcceptResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
  }

  if (typeof staffId !== "string" || staffId.trim() === "") {
    return { ok: false, error: "Identificador do profissional inválido." };
  }
  if (typeof autoAccept !== "boolean") {
    return { ok: false, error: "Valor inválido." };
  }

  const rateLimit = await consumeRateLimit({
    namespace: "crm-update-staff-auto-accept",
    identifier: userId,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiadas tentativas. Aguarda um momento." };
  }

  try {
    const business = await getCurrentBusiness();
    const staff = await setStaffAutoAccept(business.id, staffId, autoAccept);
    revalidatePath("/crm");
    return { ok: true, staff };
  } catch (error) {
    if (error instanceof CrmStaffError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
    }
    captureException("crm.update_staff_auto_accept.failed", error, {
      userId,
      staffId,
      autoAccept,
    });
    return { ok: false, error: "Erro ao guardar a preferência. Tenta novamente." };
  }
}

type BookingDecisionErrorCode = "BOOKING_NOT_PENDING" | "GENERIC";

export type BookingDecisionResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string; code: BookingDecisionErrorCode };

async function decidePendingBooking(
  bookingId: unknown,
  decision: "accept" | "reject",
): Promise<BookingDecisionResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente.", code: "GENERIC" };
  }

  if (typeof bookingId !== "string" || bookingId.trim() === "") {
    return { ok: false, error: "Identificador inválido.", code: "GENERIC" };
  }

  const namespace = decision === "accept" ? "crm-accept-booking" : "crm-reject-booking";
  const rateLimit = await consumeRateLimit({
    namespace,
    identifier: userId,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiadas tentativas. Aguarda um momento.", code: "GENERIC" };
  }

  try {
    const business = await getCurrentBusiness();
    if (decision === "accept") {
      await acceptPendingBooking(business.id, bookingId);
    } else {
      await rejectPendingBooking(business.id, bookingId);
    }
    revalidatePath("/crm");
  } catch (error) {
    if (error instanceof CrmBookingError) {
      return {
        ok: false,
        error: error.message,
        code: error.code === "BOOKING_NOT_PENDING" ? "BOOKING_NOT_PENDING" : "GENERIC",
      };
    }
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { ok: false, error: "Sessão expirada. Inicia sessão novamente.", code: "GENERIC" };
    }
    const event =
      decision === "accept" ? "crm.accept_booking.failed" : "crm.reject_booking.failed";
    captureException(event, error, { userId, bookingId });
    return {
      ok: false,
      error: decision === "accept"
        ? "Erro ao aceitar a reserva. Tenta novamente."
        : "Erro ao recusar a reserva. Tenta novamente.",
      code: "GENERIC",
    };
  }

  // Notification fora da transação — defensivo: falha não derruba a action.
  const kind = decision === "accept" ? "BOOKING_CONFIRMED" : "BOOKING_CANCELLED";
  try {
    await sendBookingNotification(bookingId, kind);
  } catch (error) {
    captureException("crm.booking_decision.notification_failed", error, {
      userId,
      bookingId,
      decision,
    });
  }

  return { ok: true, bookingId };
}

export async function acceptBookingAction(bookingId: unknown) {
  return decidePendingBooking(bookingId, "accept");
}

export async function rejectBookingAction(bookingId: unknown) {
  return decidePendingBooking(bookingId, "reject");
}

type ConfirmedBookingTransitionKind = "complete" | "cancel" | "no_show";

type ConfirmedBookingTransitionErrorCode = "BOOKING_NOT_CONFIRMED" | "GENERIC";

export type ConfirmedBookingTransitionResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string; code: ConfirmedBookingTransitionErrorCode };

const TRANSITION_NAMESPACES: Record<ConfirmedBookingTransitionKind, string> = {
  complete: "crm-complete-booking",
  cancel: "crm-cancel-confirmed-booking",
  no_show: "crm-noshow-booking",
};

const TRANSITION_GENERIC_ERRORS: Record<ConfirmedBookingTransitionKind, string> = {
  complete: "Erro ao concluir a reserva. Tenta novamente.",
  cancel: "Erro ao cancelar a reserva. Tenta novamente.",
  no_show: "Erro ao marcar não compareceu. Tenta novamente.",
};

const TRANSITION_EVENTS: Record<ConfirmedBookingTransitionKind, string> = {
  complete: "crm.complete_booking.failed",
  cancel: "crm.cancel_confirmed_booking.failed",
  no_show: "crm.noshow_booking.failed",
};

async function transitionConfirmedBookingAction(
  bookingId: unknown,
  kind: ConfirmedBookingTransitionKind,
): Promise<ConfirmedBookingTransitionResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente.", code: "GENERIC" };
  }

  if (typeof bookingId !== "string" || bookingId.trim() === "") {
    return { ok: false, error: "Identificador inválido.", code: "GENERIC" };
  }

  const rateLimit = await consumeRateLimit({
    namespace: TRANSITION_NAMESPACES[kind],
    identifier: userId,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiadas tentativas. Aguarda um momento.", code: "GENERIC" };
  }

  try {
    const business = await getCurrentBusiness();
    if (kind === "complete") {
      await completeConfirmedBooking(business.id, bookingId);
    } else if (kind === "cancel") {
      await cancelConfirmedBooking(business.id, bookingId);
    } else {
      await markBookingNoShow(business.id, bookingId);
    }
    revalidatePath("/crm");
  } catch (error) {
    if (error instanceof CrmBookingError) {
      return {
        ok: false,
        error: error.message,
        code: error.code === "BOOKING_NOT_CONFIRMED" ? "BOOKING_NOT_CONFIRMED" : "GENERIC",
      };
    }
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { ok: false, error: "Sessão expirada. Inicia sessão novamente.", code: "GENERIC" };
    }
    captureException(TRANSITION_EVENTS[kind], error, { userId, bookingId });
    return { ok: false, error: TRANSITION_GENERIC_ERRORS[kind], code: "GENERIC" };
  }

  // Só notificar após update bem-sucedido (Codex avisou). Cancelamento envia ao cliente.
  if (kind === "cancel") {
    try {
      await sendBookingNotification(bookingId, "BOOKING_CANCELLED");
    } catch (error) {
      captureException("crm.cancel_confirmed_booking.notification_failed", error, {
        userId,
        bookingId,
      });
    }
  }

  return { ok: true, bookingId };
}

export async function completeBookingAction(bookingId: unknown) {
  return transitionConfirmedBookingAction(bookingId, "complete");
}

export async function cancelConfirmedBookingAction(bookingId: unknown) {
  return transitionConfirmedBookingAction(bookingId, "cancel");
}

export async function markBookingNoShowAction(bookingId: unknown) {
  return transitionConfirmedBookingAction(bookingId, "no_show");
}

export type SaveStaffDayAvailabilityResult =
  | {
      ok: true;
      day: CrmDayAvailability;
      bookingsOutsideCount: number;
    }
  | { ok: false; error: string };

export async function saveStaffDayAvailabilityAction(
  staffId: unknown,
  dayOfWeek: unknown,
  shifts: unknown,
): Promise<SaveStaffDayAvailabilityResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
  }

  if (typeof staffId !== "string" || staffId.trim() === "") {
    return { ok: false, error: "Identificador do profissional inválido." };
  }
  if (typeof dayOfWeek !== "number" || !Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return { ok: false, error: "Dia da semana inválido." };
  }
  const sanitizedShifts = sanitizeShiftsInput(shifts);
  if (!sanitizedShifts) {
    return { ok: false, error: "Horários inválidos." };
  }

  const rateLimit = await consumeRateLimit({
    namespace: "crm-save-availability",
    identifier: userId,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiadas tentativas. Aguarda um momento." };
  }

  try {
    const business = await getCurrentBusiness();
    const day = await setStaffDayAvailability(business.id, staffId, dayOfWeek, sanitizedShifts);
    const bookingsOutsideCount = await countFutureBookingsOutsideShifts(
      business.id,
      staffId,
      dayOfWeek,
      sanitizedShifts,
      business.timezone,
    );
    revalidatePath("/crm");
    return { ok: true, day, bookingsOutsideCount };
  } catch (error) {
    if (error instanceof CrmAvailabilityError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
    }
    captureException("crm.save_availability.failed", error, { userId, staffId, dayOfWeek });
    return { ok: false, error: "Erro ao guardar horário. Tenta novamente." };
  }
}

export type CreateScheduleBlockResult =
  | { ok: true; block: CrmScheduleBlockRowDto }
  | { ok: false; error: string };

export async function createScheduleBlockAction(
  input: unknown,
): Promise<CreateScheduleBlockResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
  }

  const sanitized = sanitizeScheduleBlockInput(input);
  if (!sanitized) {
    return { ok: false, error: "Dados inválidos." };
  }

  const rateLimit = await consumeRateLimit({
    namespace: "crm-create-schedule-block",
    identifier: userId,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiadas tentativas. Aguarda um momento." };
  }

  try {
    const business = await getCurrentBusiness();
    const block = await createScheduleBlock(business.id, business.timezone, sanitized);
    revalidatePath("/crm");
    return { ok: true, block: toCrmScheduleBlockRowDto(block) };
  } catch (error) {
    if (error instanceof CrmScheduleBlockError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
    }
    captureException("crm.create_schedule_block.failed", error, { userId });
    return { ok: false, error: "Erro ao criar bloqueio. Tenta novamente." };
  }
}

export type DeleteScheduleBlockResult =
  | { ok: true; blockId: string }
  | { ok: false; error: string };

export async function deleteScheduleBlockAction(
  blockId: unknown,
): Promise<DeleteScheduleBlockResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
  }

  if (typeof blockId !== "string" || blockId.trim() === "") {
    return { ok: false, error: "Identificador inválido." };
  }

  const rateLimit = await consumeRateLimit({
    namespace: "crm-delete-schedule-block",
    identifier: userId,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiadas tentativas. Aguarda um momento." };
  }

  try {
    const business = await getCurrentBusiness();
    await deleteScheduleBlock(business.id, blockId);
    revalidatePath("/crm");
    return { ok: true, blockId };
  } catch (error) {
    if (error instanceof CrmScheduleBlockError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
    }
    captureException("crm.delete_schedule_block.failed", error, { userId, blockId });
    return { ok: false, error: "Erro ao eliminar bloqueio. Tenta novamente." };
  }
}

export type FinancialSummaryResult =
  | { ok: true; summary: CrmFinancialSummary }
  | { ok: false; error: string; locked?: true };

export async function getFinancialSummaryAction(
  period: unknown,
  staffMemberId: unknown,
  customMonth: unknown = null,
  pin: unknown = null,
): Promise<FinancialSummaryResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
  }

  const validPeriods: CrmFinancePeriod[] = ["semanal", "mensal", "trimestral", "custom"];
  if (typeof period !== "string" || !validPeriods.includes(period as CrmFinancePeriod)) {
    return { ok: false, error: "Período inválido." };
  }

  let customMonthValue: string | null = null;
  if (period === "custom") {
    if (typeof customMonth !== "string" || !/^\d{4}-\d{2}$/.test(customMonth)) {
      return { ok: false, error: "Mês inválido." };
    }
    customMonthValue = customMonth;
  }

  const staffId =
    staffMemberId == null
      ? null
      : typeof staffMemberId === "string" && staffMemberId.trim() !== ""
      ? staffMemberId
      : null;

  const rateLimit = await consumeRateLimit({
    namespace: "crm-financial-summary",
    identifier: userId,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiadas tentativas. Aguarda um momento." };
  }

  try {
    const business = await getCurrentBusiness();

    // Cadeado: os valores do 1.º profissional só saem com o código de segurança.
    // "Todos" (staffId null) e os restantes profissionais não são protegidos.
    if (staffId) {
      const lockState = await getClientListLockState(business.id);
      if (lockState.enabled && staffId === lockState.firstStaffId) {
        // Rate limit apertado só nesta via (verificação de código) para não a
        // transformar num oráculo de brute-force ao PIN. O limite de 60/min acima
        // continua a valer para a navegação normal (Todos / outros profissionais).
        const verifyLimit = await consumeRateLimit({
          namespace: "crm-finance-lock-verify",
          identifier: userId,
          limit: 10,
          windowMs: 60_000,
        });
        if (!verifyLimit.ok) {
          return { ok: false, error: "Demasiadas tentativas. Aguarda um momento.", locked: true };
        }
        try {
          await verifyClientListLock(business.id, pin);
        } catch {
          return {
            ok: false,
            error: "Estes valores estão protegidos. Introduz o código de segurança.",
            locked: true,
          };
        }
      }
    }

    const summary = await computeFinancialSummary(business.id, {
      period: period as CrmFinancePeriod,
      staffMemberId: staffId,
      timezone: business.timezone,
      customMonth: customMonthValue,
    });
    return { ok: true, summary };
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
    }
    captureException("crm.financial_summary.failed", error, { userId, period, staffMemberId });
    return { ok: false, error: "Erro ao carregar valores. Tenta novamente." };
  }
}

type ManualBookingFieldKey =
  | "serviceId"
  | "staffMemberId"
  | "dateKey"
  | "time"
  | "customerName"
  | "customerEmail"
  | "customerPhone"
  | "notes";

export type CreateManualBookingResult =
  | {
      ok: true;
      booking: {
        id: string;
        startsAt: string;
        endsAt: string;
        staffMemberId: string;
        staffMemberName: string;
        serviceName: string;
        customerName: string;
      };
    }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<ManualBookingFieldKey, string>>;
    };

export async function createManualBookingAction(
  input: unknown,
): Promise<CreateManualBookingResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
  }

  const sanitized = sanitizeManualBookingInput(input);
  if (!sanitized) {
    return { ok: false, error: "Dados inválidos." };
  }

  const fieldErrors = validateManualBookingFields(sanitized);
  if (fieldErrors) {
    return {
      ok: false,
      error: Object.values(fieldErrors)[0] ?? "Dados inválidos.",
      fieldErrors,
    };
  }

  const rateLimit = await consumeRateLimit({
    namespace: "crm-create-manual-booking",
    identifier: userId,
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiadas tentativas. Aguarda um momento." };
  }

  let booking: Awaited<ReturnType<typeof createManualBooking>>;
  try {
    const business = await getCurrentBusiness();
    booking = await createManualBooking(business.id, business.timezone, sanitized);
    revalidatePath("/crm");
  } catch (error) {
    if (error instanceof CrmManualBookingError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
    }
    captureException("crm.create_manual_booking.failed", error, { userId });
    return { ok: false, error: "Erro ao criar marcação. Tenta novamente." };
  }

  // Notificações fora da transação, defensivas (não falham a action).
  if (booking.notifyClient) {
    try {
      await sendBookingNotification(booking.bookingId, "BOOKING_CONFIRMED");
    } catch (error) {
      captureException("crm.manual_booking.client_notification_failed", error, {
        userId,
        bookingId: booking.bookingId,
      });
    }
  }

  return {
    ok: true,
    booking: {
      id: booking.bookingId,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      staffMemberId: booking.staffMemberId,
      staffMemberName: booking.staffMemberName,
      serviceName: booking.serviceName,
      customerName: booking.customerName,
    },
  };
}

function sanitizeManualBookingInput(value: unknown): CrmManualBookingInput | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.serviceId !== "string") return null;
  if (typeof v.staffMemberId !== "string") return null;
  if (typeof v.dateKey !== "string") return null;
  if (typeof v.time !== "string") return null;
  if (typeof v.customerName !== "string") return null;

  const customerEmail = typeof v.customerEmail === "string" ? v.customerEmail : "";
  const customerPhone = typeof v.customerPhone === "string" ? v.customerPhone : "";
  const notes = typeof v.notes === "string" ? v.notes.slice(0, 280) : null;
  const notifyClient = v.notifyClient === true;

  return {
    serviceId: v.serviceId,
    staffMemberId: v.staffMemberId,
    dateKey: v.dateKey,
    time: v.time,
    customerName: v.customerName,
    customerEmail,
    customerPhone,
    notes,
    notifyClient,
  };
}

function validateManualBookingFields(
  input: CrmManualBookingInput,
): Partial<Record<ManualBookingFieldKey, string>> | null {
  const errors: Partial<Record<ManualBookingFieldKey, string>> = {};
  const trimmedName = input.customerName.trim();
  if (trimmedName.length === 0) {
    errors.customerName = "Nome obrigatório.";
  } else if (trimmedName.length > 80) {
    errors.customerName = "Nome demasiado longo.";
  }
  if (!input.serviceId) errors.serviceId = "Escolhe um serviço.";
  if (!input.staffMemberId) errors.staffMemberId = "Escolhe um profissional.";
  if (!input.dateKey) errors.dateKey = "Escolhe uma data.";
  if (!input.time) errors.time = "Escolhe uma hora.";
  if (input.customerEmail && input.customerEmail.length > 0) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.customerEmail)) {
      errors.customerEmail = "Email inválido.";
    }
  }
  if (input.customerPhone && input.customerPhone.length > 0) {
    if (!/^[+()\-\s\d]{6,30}$/.test(input.customerPhone)) {
      errors.customerPhone = "Telefone inválido.";
    }
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

function sanitizeScheduleBlockInput(value: unknown): CrmScheduleBlockInput | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  const kind = v.kind;
  if (kind !== "all_day" && kind !== "time_range") return null;

  const startDateKey = v.startDateKey;
  const endDateKey = v.endDateKey;
  if (typeof startDateKey !== "string" || typeof endDateKey !== "string") return null;

  const staffMemberRaw = v.staffMemberId;
  const staffMemberId =
    staffMemberRaw == null
      ? null
      : typeof staffMemberRaw === "string" && staffMemberRaw.trim() !== ""
      ? staffMemberRaw
      : null;

  let startTime: string | null = null;
  let endTime: string | null = null;
  if (kind === "time_range") {
    if (typeof v.startTime !== "string" || typeof v.endTime !== "string") return null;
    startTime = v.startTime;
    endTime = v.endTime;
  }

  const reasonRaw = v.reason;
  const reason =
    typeof reasonRaw === "string" ? reasonRaw.slice(0, 200) : null;

  return {
    staffMemberId,
    kind: kind as CrmScheduleBlockKind,
    startDateKey,
    endDateKey,
    startTime,
    endTime,
    reason,
  };
}

function sanitizeShiftsInput(value: unknown): CrmShift[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > 2) return null;
  const result: CrmShift[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const start = (item as { startTime?: unknown }).startTime;
    const end = (item as { endTime?: unknown }).endTime;
    if (typeof start !== "string" || typeof end !== "string") return null;
    result.push({ startTime: start, endTime: end });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Cadeado da lista de clientes do primeiro profissional (secção agendamento)
// ---------------------------------------------------------------------------

export type ClientListLockMutationResult = { ok: true } | { ok: false; error: string };

function mapClientListLockError(error: unknown): string | null {
  if (error instanceof CrmClientListLockError) {
    return error.message;
  }
  if (error instanceof Error && error.message === "AUTH_REQUIRED") {
    return "Sessão expirada. Inicia sessão novamente.";
  }
  return null;
}

export async function setClientListLockAction(
  pin: unknown,
): Promise<ClientListLockMutationResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
  }

  const rateLimit = await consumeRateLimit({
    namespace: "crm-client-list-lock-set",
    identifier: userId,
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiadas tentativas. Aguarda um momento." };
  }

  try {
    const business = await getCurrentBusiness();
    await setClientListLock(business.id, pin);
    revalidatePath("/crm");
    return { ok: true };
  } catch (error) {
    const mapped = mapClientListLockError(error);
    if (mapped) return { ok: false, error: mapped };
    captureException("crm.client_list_lock.set_failed", error, { userId });
    return { ok: false, error: "Erro ao proteger a lista. Tenta novamente." };
  }
}

export async function changeClientListLockAction(
  currentPin: unknown,
  newPin: unknown,
): Promise<ClientListLockMutationResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
  }

  const rateLimit = await consumeRateLimit({
    namespace: "crm-client-list-lock-change",
    identifier: userId,
    // Verifica o código atual → limite apertado contra brute-force.
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiadas tentativas. Aguarda um momento." };
  }

  try {
    const business = await getCurrentBusiness();
    await changeClientListLock(business.id, currentPin, newPin);
    revalidatePath("/crm");
    return { ok: true };
  } catch (error) {
    const mapped = mapClientListLockError(error);
    if (mapped) return { ok: false, error: mapped };
    captureException("crm.client_list_lock.change_failed", error, { userId });
    return { ok: false, error: "Erro ao alterar o código. Tenta novamente." };
  }
}

export async function removeClientListLockAction(
  currentPin: unknown,
): Promise<ClientListLockMutationResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
  }

  const rateLimit = await consumeRateLimit({
    namespace: "crm-client-list-lock-remove",
    identifier: userId,
    // Verifica o código atual → limite apertado contra brute-force.
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiadas tentativas. Aguarda um momento." };
  }

  try {
    const business = await getCurrentBusiness();
    await removeClientListLock(business.id, currentPin);
    revalidatePath("/crm");
    return { ok: true };
  } catch (error) {
    const mapped = mapClientListLockError(error);
    if (mapped) return { ok: false, error: mapped };
    captureException("crm.client_list_lock.remove_failed", error, { userId });
    return { ok: false, error: "Erro ao remover a proteção. Tenta novamente." };
  }
}

export type UnlockClientListResult =
  | {
      ok: true;
      pendingBookings: CrmPendingBookingDto[];
      weeklyBookings: CrmBookingRowDto[];
      dailyBookings: CrmBookingRowDto[];
      customers: CrmCustomerRowDto[];
    }
  | { ok: false; error: string };

export async function unlockClientListAction(
  pin: unknown,
): Promise<UnlockClientListResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
  }

  // Limite apertado: é uma verificação de código, protege contra brute-force.
  const rateLimit = await consumeRateLimit({
    namespace: "crm-client-list-lock-unlock",
    identifier: userId,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiadas tentativas. Aguarda um momento." };
  }

  try {
    const business = await getCurrentBusiness();
    const firstStaffId = await verifyClientListLock(business.id, pin);

    const [pending, weekly, daily, customers] = await Promise.all([
      listPendingBookings(business.id),
      listWeeklyBookings(business.id, { timezone: business.timezone }),
      listDailyBookings(business.id, { timezone: business.timezone }),
      listCustomers(business.id),
    ]);

    return {
      ok: true,
      pendingBookings: pending
        .filter((booking) => booking.staffMemberId === firstStaffId)
        .map(toCrmPendingBookingDto),
      weeklyBookings: weekly
        .filter((booking) => booking.staffMemberId === firstStaffId)
        .map(toCrmBookingRowDto),
      dailyBookings: daily
        .filter((booking) => booking.staffMemberId === firstStaffId)
        .map(toCrmBookingRowDto),
      // Clientes que marcaram com o 1.º barbeiro (exclusivos + partilhados).
      // O merge no cliente repõe os exclusivos que foram escondidos do payload.
      customers: customers
        .filter((customer) => customer.staffMemberIds.includes(firstStaffId))
        .map(toCrmCustomerRowDto),
    };
  } catch (error) {
    const mapped = mapClientListLockError(error);
    if (mapped) return { ok: false, error: mapped };
    captureException("crm.client_list_lock.unlock_failed", error, { userId });
    return { ok: false, error: "Erro ao desbloquear. Tenta novamente." };
  }
}

// --- Recuperação do código de segurança por email (secção Conta) ---------------

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const shown = local.slice(0, 1);
  return `${shown}${"*".repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

function buildLockResetEmailHtml(code: string, businessName: string): string {
  return `<!doctype html><html lang="pt"><body style="margin:0;background:#f4f4f5;padding:24px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0a0a0a">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e4e4e7">
    <h1 style="font-size:18px;margin:0 0 8px">Redefinir o código de segurança</h1>
    <p style="font-size:14px;color:#52525b;margin:0 0 24px">Pediste para redefinir o código que protege as listas de ${businessName} no ONNEX. Introduz este código na secção Conta:</p>
    <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:16px;background:#0a0a0a;color:#fff;border-radius:10px">${code}</div>
    <p style="font-size:12px;color:#71717a;margin:24px 0 0">O código é válido durante 15 minutos. Se não foste tu, ignora este email — a proteção mantém-se.</p>
  </div></body></html>`;
}

export type RequestClientListLockResetResult =
  | { ok: true; delivery: "email"; to: string }
  | { ok: true; delivery: "dev"; code: string }
  | { ok: false; error: string };

export async function requestClientListLockResetAction(): Promise<RequestClientListLockResetResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
  }

  const rateLimit = await consumeRateLimit({
    namespace: "crm-client-list-lock-reset-request",
    identifier: userId,
    limit: 5,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiados pedidos. Aguarda um momento." };
  }

  try {
    const business = await getCurrentBusiness();
    const code = await requestClientListLockReset(business.id);

    const owner = await db.user.findUnique({
      where: { id: business.ownerId },
      select: { email: true },
    });
    const to = owner?.email?.trim();
    if (!to) {
      return { ok: false, error: "Não encontrámos o email da tua conta." };
    }

    const emailResult = await sendEmail({
      to,
      subject: "ONNEX — código para redefinir a proteção das listas",
      html: buildLockResetEmailHtml(code, business.name),
    });

    if (emailResult.ok) {
      return { ok: true, delivery: "email", to: maskEmail(to) };
    }

    // Ambiente sem Resend (ex.: localhost): mostramos o código só em desenvolvimento
    // para permitir testar. Em produção o Resend está configurado.
    if (emailResult.skipped && process.env.NODE_ENV !== "production") {
      return { ok: true, delivery: "dev", code };
    }

    captureException("crm.client_list_lock.reset_email_failed", new Error(emailResult.reason), {
      userId,
    });
    return { ok: false, error: "Não foi possível enviar o email. Tenta novamente." };
  } catch (error) {
    const mapped = mapClientListLockError(error);
    if (mapped) return { ok: false, error: mapped };
    captureException("crm.client_list_lock.reset_request_failed", error, { userId });
    return { ok: false, error: "Erro ao pedir a recuperação. Tenta novamente." };
  }
}

export async function confirmClientListLockResetAction(
  code: unknown,
): Promise<ClientListLockMutationResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };
  }

  const rateLimit = await consumeRateLimit({
    namespace: "crm-client-list-lock-reset-confirm",
    identifier: userId,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return { ok: false, error: "Demasiadas tentativas. Aguarda um momento." };
  }

  try {
    const business = await getCurrentBusiness();
    await confirmClientListLockReset(business.id, code);
    revalidatePath("/crm");
    return { ok: true };
  } catch (error) {
    const mapped = mapClientListLockError(error);
    if (mapped) return { ok: false, error: mapped };
    captureException("crm.client_list_lock.reset_confirm_failed", error, { userId });
    return { ok: false, error: "Erro ao confirmar o código. Tenta novamente." };
  }
}
