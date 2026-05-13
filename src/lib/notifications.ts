import { Prisma } from "@prisma/client";
import { addMinutes, format } from "date-fns";
import { getAppUrl } from "./app-config";
import {
  DEFAULT_AUTOMATION,
  getBusinessAutomation,
  getBusinessAutomationMap,
  type CrmAutomationConfig,
} from "./crm/automation";
import { db } from "./db";
import { captureException } from "./observability";

type NotificationKind =
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_CANCELLED_INTERNAL"
  | "BOOKING_RESCHEDULED"
  | "BOOKING_REMINDER"
  | "BOOKING_ADVANCEMENT"
  | "BOOKING_STAFF_NEW_BOOKING"
  | "BOOKING_STAFF_PENDING_REQUEST";

type NotificationChannel = "EMAIL" | "WHATSAPP";
type ReminderRunSource = "CRON" | "DASHBOARD";
type ReminderRunStatus = "SUCCESS" | "FAILED" | "UNAUTHORIZED" | "MISCONFIGURED";

type DeliveryStatus = "sent" | "skipped" | "failed" | "duplicate";

type DeliveryResult = {
  channel: NotificationChannel;
  status: DeliveryStatus;
  reason?: string;
};

type BookingNotificationPayload = {
  id: string;
  publicToken: string | null;
  startsAt: Date;
  endsAt: Date;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: string;
  business: {
    id: string;
    name: string;
    slug: string;
    contactPhone: string | null;
    owner: {
      email: string;
      firstName: string | null;
    };
  };
  service: {
    name: string;
  };
  staffMember: {
    fullName: string;
    email: string | null;
    phone: string | null;
    autoAcceptBookings: boolean;
  } | null;
};

function buildManageUrl(booking: BookingNotificationPayload) {
  return booking.publicToken ? `${getAppUrl()}/booking/${booking.publicToken}` : `${getAppUrl()}/${booking.business.slug}`;
}

function buildPublicPageUrl(booking: BookingNotificationPayload) {
  return `${getAppUrl()}/${booking.business.slug}`;
}

function getRepresentativeWhatsappRecipient(booking: BookingNotificationPayload) {
  return booking.business.contactPhone;
}

type MessageContext = {
  // Para BOOKING_ADVANCEMENT: hora exacta que ficou livre na agenda.
  freedSlotAt?: Date;
  // Para BOOKING_CANCELLED_INTERNAL: nome do próximo cliente convidado a adiantar.
  nextCustomerName?: string;
};

function buildWhatsappMessage(
  kind: NotificationKind,
  booking: BookingNotificationPayload,
  automation?: CrmAutomationConfig,
  context?: MessageContext,
) {
  const when = format(booking.startsAt, "dd/MM HH:mm");
  const professional = booking.staffMember?.fullName ?? "equipa";
  const manageUrl = buildManageUrl(booking);

  switch (kind) {
    case "BOOKING_CREATED":
      return `Reserva recebida em ${booking.business.name}: ${booking.service.name} a ${when} com ${professional}. Gerir: ${manageUrl}`;
    case "BOOKING_CONFIRMED":
      return `Reserva confirmada em ${booking.business.name}: ${booking.service.name} a ${when} com ${professional}. ${manageUrl}`;
    case "BOOKING_CANCELLED":
      return `A tua reserva em ${booking.business.name} foi cancelada. Se quiseres marcar novamente: ${buildPublicPageUrl(booking)}`;
    case "BOOKING_CANCELLED_INTERNAL":
      if (context?.nextCustomerName) {
        return `${booking.business.name}: ${booking.customerName} não confirmou ${booking.service.name} de ${when} e foi cancelado. Já convidámos ${context.nextCustomerName} a adiantar — aguardamos resposta. Ver: ${manageUrl}`;
      }
      return `Cancelamento recebido: ${booking.customerName} cancelou ${booking.service.name} a ${when}. Ver: ${manageUrl}`;
    case "BOOKING_RESCHEDULED":
      return `Reserva remarcada em ${booking.business.name}: novo horário ${when} com ${professional}. ${manageUrl}`;
    case "BOOKING_REMINDER": {
      const cfg = automation ?? DEFAULT_AUTOMATION;
      return `Lembrete: faltam ~${cfg.reminderMinutesBefore} min para ${booking.service.name} em ${booking.business.name}. Confirma a tua presença aqui — sem confirmação, cancelamos automaticamente em ${cfg.confirmationToleranceMinutes} min: ${manageUrl}`;
    }
    case "BOOKING_ADVANCEMENT":
      if (context?.freedSlotAt) {
        const freed = format(context.freedSlotAt, "HH:mm");
        return `${booking.business.name}: boa notícia — abriu vaga às ${freed}. A tua reserva de ${booking.service.name} está marcada para ${when}. Queres adiantar para as ${freed}? Confirma aqui: ${manageUrl}`;
      }
      return `${booking.business.name}: Houve uma disponibilidade! Podes adiantar a tua reserva de ${booking.service.name} a ${when}. Ver: ${manageUrl}`;
    case "BOOKING_STAFF_NEW_BOOKING":
      return `${booking.business.name}: Novo agendamento confirmado - ${booking.customerName}, ${booking.service.name} a ${when}. Ver: ${getAppUrl()}/crm`;
    case "BOOKING_STAFF_PENDING_REQUEST":
      return `${booking.business.name}: Pedido pendente - ${booking.customerName}, ${booking.service.name} a ${when}. Aceita ou recusa: ${getAppUrl()}/crm`;
  }
}

async function createNotificationLog(input: {
  bookingId: string;
  businessId: string;
  channel: NotificationChannel;
  kind: NotificationKind;
  recipient: string;
  status: "PENDING" | "SENT" | "FAILED" | "SKIPPED";
  providerMessageId?: string;
  errorMessage?: string;
  payload?: Prisma.InputJsonValue;
  sentAt?: Date;
}) {
  return db.notificationLog.create({
    data: {
      bookingId: input.bookingId,
      businessId: input.businessId,
      channel: input.channel,
      kind: input.kind,
      recipient: input.recipient,
      status: input.status,
      providerMessageId: input.providerMessageId,
      errorMessage: input.errorMessage,
      payload: input.payload,
      sentAt: input.sentAt,
    },
  });
}

async function loadBookingNotificationPayload(bookingId: string) {
  return db.booking.findUnique({
    where: { id: bookingId },
    include: {
      business: {
        include: {
          owner: true,
        },
      },
      service: true,
      staffMember: true,
    },
  });
}

async function reserveNotificationDelivery(input: {
  bookingId: string;
  businessId: string;
  channel: NotificationChannel;
  kind: NotificationKind;
  recipient: string;
}) {
  return db.$transaction(async (tx) => {
    const pendingCutoff = new Date(Date.now() - 10 * 60_000);
    const existing = await tx.notificationLog.findFirst({
      where: {
        bookingId: input.bookingId,
        channel: input.channel,
        kind: input.kind,
        recipient: input.recipient,
        OR: [
          { status: "SENT" },
          { status: "PENDING", createdAt: { gt: pendingCutoff } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return { duplicate: true as const, logId: existing.id };
    }

    const log = await tx.notificationLog.create({
      data: {
        bookingId: input.bookingId,
        businessId: input.businessId,
        channel: input.channel,
        kind: input.kind,
        recipient: input.recipient,
        status: "PENDING",
      },
      select: { id: true },
    });

    return { duplicate: false as const, logId: log.id };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

async function createSkippedNotification(
  booking: BookingNotificationPayload,
  channel: NotificationChannel,
  kind: NotificationKind,
  reason: string,
  recipient = "",
) {
  await createNotificationLog({
    bookingId: booking.id,
    businessId: booking.business.id,
    channel,
    kind,
    recipient,
    status: "SKIPPED",
    errorMessage: reason,
  });
}

async function safeReadJson(response: Response) {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function shouldRetryProviderResponse(status: number) {
  return status === 429 || status >= 500;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithProviderRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  options: { attempts?: number; baseDelayMs?: number } = {},
) {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 600;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(input, init);
    lastResponse = response;

    if (!shouldRetryProviderResponse(response.status) || attempt === attempts - 1) {
      return response;
    }

    await wait(baseDelayMs * (attempt + 1));
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw new Error("PROVIDER_REQUEST_FAILED");
}

function normalizeWhatsappAddress(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("whatsapp:") ? trimmed : `whatsapp:${trimmed}`;
}

// Aceita números no formato E.164 (`+CCNNNN...`) ou já com prefixo `whatsapp:`.
// Sem `+`, o Twilio interpreta mal e marca a mensagem como SENT no nosso log
// mesmo quando falha a entrega (vimos isso em 2026-05-12 com `924057914`).
function isValidWhatsappRecipient(value: string) {
  const trimmed = value.trim().replace(/^whatsapp:/, "");
  return /^\+[1-9]\d{6,14}$/.test(trimmed);
}

async function sendWhatsappForKind(
  booking: BookingNotificationPayload,
  kind: NotificationKind,
  recipient: string,
  automation?: CrmAutomationConfig,
  context?: MessageContext,
) {
  if (!isValidWhatsappRecipient(recipient)) {
    await createNotificationLog({
      bookingId: booking.id,
      businessId: booking.business.id,
      channel: "WHATSAPP",
      kind,
      recipient,
      status: "SKIPPED",
      errorMessage: "WHATSAPP_RECIPIENT_INVALID_FORMAT",
    });
    return {
      channel: "WHATSAPP",
      status: "skipped",
      reason: "WHATSAPP_RECIPIENT_INVALID_FORMAT",
    } satisfies DeliveryResult;
  }

  const reservation = await reserveNotificationDelivery({
    bookingId: booking.id,
    businessId: booking.business.id,
    channel: "WHATSAPP",
    kind,
    recipient,
  });

  if (reservation.duplicate) {
    return { channel: "WHATSAPP", status: "duplicate" } satisfies DeliveryResult;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM?.trim();

  if (!accountSid || !authToken || !fromNumber) {
    await db.notificationLog.update({
      where: { id: reservation.logId },
      data: {
        status: "SKIPPED",
        errorMessage: "WHATSAPP_PROVIDER_NOT_CONFIGURED",
      },
    });
    return { channel: "WHATSAPP", status: "skipped", reason: "WHATSAPP_PROVIDER_NOT_CONFIGURED" } satisfies DeliveryResult;
  }

  try {
    const response = await fetchWithProviderRetry(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: normalizeWhatsappAddress(recipient),
        From: normalizeWhatsappAddress(fromNumber),
        Body: buildWhatsappMessage(kind, booking, automation, context),
      }).toString(),
    });

    const payload = await safeReadJson(response);

    if (!response.ok) {
      await db.notificationLog.update({
        where: { id: reservation.logId },
        data: {
          status: "FAILED",
          errorMessage: String(payload.message ?? payload.code ?? "WHATSAPP_SEND_FAILED"),
          payload: payload as Prisma.InputJsonValue,
        },
      });

      return { channel: "WHATSAPP", status: "failed", reason: String(payload.message ?? "WHATSAPP_SEND_FAILED") } satisfies DeliveryResult;
    }

    await db.notificationLog.update({
      where: { id: reservation.logId },
      data: {
        status: "SENT",
        providerMessageId: typeof payload.sid === "string" ? payload.sid : undefined,
        payload: payload as Prisma.InputJsonValue,
        sentAt: new Date(),
      },
    });

    return { channel: "WHATSAPP", status: "sent" } satisfies DeliveryResult;
  } catch (error) {
    captureException("notification.whatsapp_failed", error, {
      bookingId: booking.id,
      kind,
      recipient,
    });

    await db.notificationLog.update({
      where: { id: reservation.logId },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "WHATSAPP_SEND_FAILED",
      },
    });

    return {
      channel: "WHATSAPP",
      status: "failed",
      reason: error instanceof Error ? error.message : "WHATSAPP_SEND_FAILED",
    } satisfies DeliveryResult;
  }
}

function summarizeDeliveries(results: DeliveryResult[]) {
  if (results.some((result) => result.status === "sent")) {
    return { status: "sent" as const, channels: results };
  }
  if (results.some((result) => result.status === "failed")) {
    return { status: "failed" as const, channels: results };
  }
  if (results.some((result) => result.status === "duplicate")) {
    return { status: "duplicate" as const, channels: results };
  }
  return { status: "skipped" as const, channels: results };
}

export async function sendBookingNotification(
  bookingId: string,
  kind: Exclude<
    NotificationKind,
    "BOOKING_CANCELLED_INTERNAL" | "BOOKING_STAFF_NEW_BOOKING" | "BOOKING_STAFF_PENDING_REQUEST"
  >,
  automation?: CrmAutomationConfig,
  context?: MessageContext,
) {
  const booking = await loadBookingNotificationPayload(bookingId);

  if (!booking) {
    return { status: "missing" as const, channels: [] as DeliveryResult[] };
  }

  // BOOKING_REMINDER usa o template dinâmico (X min, tolerância Y). Quando o
  // chamador (cron) já carregou a config do business, reaproveitamos — caso
  // contrário (ações pontuais), vamos buscar uma vez.
  const cfg =
    automation ?? (kind === "BOOKING_REMINDER" ? await getBusinessAutomation(booking.business.id) : undefined);

  const deliveries: DeliveryResult[] = [];

  if (booking.customerPhone) {
    deliveries.push(await sendWhatsappForKind(booking, kind, booking.customerPhone, cfg, context));
  } else {
    await createSkippedNotification(booking, "WHATSAPP", kind, "CUSTOMER_PHONE_MISSING");
  }

  return summarizeDeliveries(deliveries);
}

export async function sendStaffBookingNotification(
  bookingId: string,
  kind: Extract<NotificationKind, "BOOKING_STAFF_NEW_BOOKING" | "BOOKING_STAFF_PENDING_REQUEST">,
) {
  const booking = await loadBookingNotificationPayload(bookingId);

  if (!booking) {
    return { status: "missing" as const, channels: [] as DeliveryResult[] };
  }

  if (!booking.staffMember) {
    return { status: "skipped" as const, channels: [] as DeliveryResult[] };
  }

  const deliveries: DeliveryResult[] = [];
  const staffPhone = booking.staffMember.phone?.trim() || null;

  if (staffPhone) {
    deliveries.push(await sendWhatsappForKind(booking, kind, staffPhone));
  } else {
    await createSkippedNotification(booking, "WHATSAPP", kind, "STAFF_PHONE_MISSING");
  }

  return summarizeDeliveries(deliveries);
}

export async function sendRepresentativeBookingNotification(
  bookingId: string,
  kind: Extract<NotificationKind, "BOOKING_CANCELLED_INTERNAL">,
  context?: MessageContext,
) {
  const booking = await loadBookingNotificationPayload(bookingId);

  if (!booking) {
    return { status: "missing" as const, channels: [] as DeliveryResult[] };
  }

  const deliveries: DeliveryResult[] = [];
  const whatsappRecipient = getRepresentativeWhatsappRecipient(booking);

  if (whatsappRecipient) {
    deliveries.push(await sendWhatsappForKind(booking, kind, whatsappRecipient, undefined, context));
  } else {
    await createSkippedNotification(booking, "WHATSAPP", kind, "REPRESENTATIVE_PHONE_MISSING");
  }

  return summarizeDeliveries(deliveries);
}

export async function logReminderRunExecution(input: {
  source: ReminderRunSource;
  status: ReminderRunStatus;
  authorizationSource?: string | null;
  userAgent?: string | null;
  reminderStartMinutes?: number;
  reminderEndMinutes?: number;
  scanned?: number;
  sent?: number;
  skipped?: number;
  failed?: number;
  errorMessage?: string | null;
}) {
  return db.reminderRunLog.create({
    data: {
      source: input.source,
      status: input.status,
      authorizationSource: input.authorizationSource || null,
      userAgent: input.userAgent || null,
      reminderStartMinutes: input.reminderStartMinutes ?? 25,
      reminderEndMinutes: input.reminderEndMinutes ?? 35,
      scanned: input.scanned ?? 0,
      sent: input.sent ?? 0,
      skipped: input.skipped ?? 0,
      failed: input.failed ?? 0,
      errorMessage: input.errorMessage || null,
    },
  });
}

// Janela máxima que vamos varrer em cada cron run. Cobre qualquer combinação
// razoável de reminderMinutesBefore (max 240 = 4h) + confirmationToleranceMinutes
// (max 120). Mantém a query única e barata para Bukly scale.
const MAX_LOOKAHEAD_MINUTES = 240;

function minutesFromNow(date: Date) {
  return (date.getTime() - Date.now()) / 60_000;
}

function isWithinTarget(startsAt: Date, targetMinutes: number, halfWidthMinutes: number) {
  return Math.abs(minutesFromNow(startsAt) - targetMinutes) <= halfWidthMinutes;
}

type UpcomingBooking = {
  id: string;
  businessId: string;
  startsAt: Date;
  staffMemberId: string | null;
};

async function fetchUpcomingBookings(opts: {
  unconfirmedOnly?: boolean;
  requireReminderSent?: boolean;
} = {}): Promise<UpcomingBooking[]> {
  return db.booking.findMany({
    where: {
      startsAt: {
        gte: new Date(),
        lte: addMinutes(new Date(), MAX_LOOKAHEAD_MINUTES),
      },
      status: { in: ["PENDING", "CONFIRMED"] },
      customerPhone: { not: null },
      ...(opts.unconfirmedOnly ? { customerConfirmedAt: null } : {}),
      ...(opts.requireReminderSent
        ? {
            notifications: {
              some: { kind: "BOOKING_REMINDER", status: "SENT" },
            },
          }
        : {}),
    },
    select: { id: true, businessId: true, startsAt: true, staffMemberId: true },
  });
}

async function loadAutomationFor(bookings: UpcomingBooking[]) {
  return getBusinessAutomationMap(Array.from(new Set(bookings.map((b) => b.businessId))));
}

function getConfig(map: Map<string, CrmAutomationConfig>, businessId: string) {
  return map.get(businessId) ?? DEFAULT_AUTOMATION;
}

function summarize(scanned: number, results: ReadonlyArray<{ status: string }>) {
  return {
    scanned,
    sent: results.filter((r) => r.status === "sent").length,
    skipped: results.filter((r) => r.status === "skipped" || r.status === "duplicate").length,
    failed: results.filter((r) => r.status === "failed").length,
  };
}

export async function sendUpcomingBookingReminders() {
  const all = await fetchUpcomingBookings();
  const automationMap = await loadAutomationFor(all);

  const eligible = all.filter((booking) => {
    const config = getConfig(automationMap, booking.businessId);
    if (!config.reminderEnabled) return false;
    return isWithinTarget(booking.startsAt, config.reminderMinutesBefore, 5);
  });

  const results = await Promise.all(
    eligible.map((booking) =>
      sendBookingNotification(
        booking.id,
        "BOOKING_REMINDER",
        getConfig(automationMap, booking.businessId),
      ),
    ),
  );

  return summarize(eligible.length, results);
}

export async function autoCancelUnconfirmedBookings() {
  const candidates = await fetchUpcomingBookings({
    unconfirmedOnly: true,
    requireReminderSent: true,
  });
  const automationMap = await loadAutomationFor(candidates);

  const toCancel = candidates.filter((booking) => {
    const config = getConfig(automationMap, booking.businessId);
    if (!config.reminderEnabled) return false;
    // Auto-cancel corre `confirmationToleranceMinutes` depois do lembrete:
    // se lembrete foi a T-30 com 10 min de tolerância, cancela a T-20.
    const target = config.reminderMinutesBefore - config.confirmationToleranceMinutes;
    if (target <= 0) return false;
    return isWithinTarget(booking.startsAt, target, 2);
  });

  let cancelled = 0;
  let advancementsSent = 0;

  for (const booking of toCancel) {
    // Update condicional: se o cliente confirmou (ou alguem cancelou) entre o
    // findMany e este update, count=0 e saltamos. Evita cancelar marcacoes
    // que ja foram confirmadas durante o tempo de iteracao do cron.
    const updated = await db.booking.updateMany({
      where: {
        id: booking.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        customerConfirmedAt: null,
      },
      data: { status: "CANCELLED" },
    });
    if (updated.count === 0) continue;

    // 1. Avisa o cliente cancelado.
    await sendBookingNotification(booking.id, "BOOKING_CANCELLED");
    cancelled++;

    // 2. Procura próximo cliente da agenda do mesmo barbeiro e convida a adiantar.
    let nextCustomerName: string | undefined;
    if (booking.staffMemberId) {
      const nextBooking = await db.booking.findFirst({
        where: {
          staffMemberId: booking.staffMemberId,
          businessId: booking.businessId,
          startsAt: { gt: booking.startsAt },
          status: { in: ["PENDING", "CONFIRMED"] },
          id: { not: booking.id },
        },
        orderBy: { startsAt: "asc" },
        select: { id: true, customerName: true },
      });

      if (nextBooking) {
        await sendBookingNotification(
          nextBooking.id,
          "BOOKING_ADVANCEMENT",
          undefined,
          { freedSlotAt: booking.startsAt },
        );
        nextCustomerName = nextBooking.customerName;
        advancementsSent++;
      }
    }

    // 3. Avisa o dono — uma única mensagem que combina cancelamento + convite ao próximo.
    await sendRepresentativeBookingNotification(
      booking.id,
      "BOOKING_CANCELLED_INTERNAL",
      nextCustomerName ? { nextCustomerName } : undefined,
    );
  }

  return { scanned: toCancel.length, cancelled, advancementsSent };
}
