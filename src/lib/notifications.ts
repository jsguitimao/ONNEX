import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { getAppUrl } from "./app-config";
import { db } from "./db";
import { sendEmail } from "./email";
import { captureException } from "./observability";

type NotificationKind =
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_RESCHEDULED"
  | "BOOKING_STAFF_NEW_BOOKING"
  | "BOOKING_STAFF_PENDING_REQUEST";

type NotificationChannel = "EMAIL" | "WHATSAPP";

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

function buildWhatsappMessage(
  kind: NotificationKind,
  booking: BookingNotificationPayload,
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
    case "BOOKING_RESCHEDULED":
      return `Reserva remarcada em ${booking.business.name}: novo horário ${when} com ${professional}. ${manageUrl}`;
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
  const findActiveDelivery = (tx: Prisma.TransactionClient) =>
    tx.notificationLog.findFirst({
      where: {
        bookingId: input.bookingId,
        channel: input.channel,
        kind: input.kind,
        recipient: input.recipient,
        status: { in: ["PENDING", "SENT"] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

  return db.$transaction(async (tx) => {
    const pendingCutoff = new Date(Date.now() - 10 * 60_000);
    await tx.notificationLog.updateMany({
      where: {
        bookingId: input.bookingId,
        channel: input.channel,
        kind: input.kind,
        recipient: input.recipient,
        status: "PENDING",
        createdAt: { lte: pendingCutoff },
      },
      data: {
        status: "FAILED",
        errorMessage: "PENDING_DELIVERY_EXPIRED",
      },
    });

    const existing = await findActiveDelivery(tx);
    if (existing) return { duplicate: true as const, logId: existing.id };

    try {
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
    } catch (error) {
      const isUniqueViolation =
        typeof error === "object" &&
        error !== null &&
        (error as { code?: string }).code === "P2002";
      if (!isUniqueViolation) throw error;

      const duplicate = await findActiveDelivery(tx);
      if (duplicate) return { duplicate: true as const, logId: duplicate.id };
      throw error;
    }
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
  } catch (error) {
    captureException("notification.provider_json_parse_failed", error, {
      status: response.status,
    });
    return {};
  }
}

function shouldRetryProviderResponse(status: number) {
  return status === 429 || status >= 500;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PROVIDER_REQUEST_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithProviderRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  options: { attempts?: number; baseDelayMs?: number; timeoutMs?: number } = {},
) {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 600;
  const timeoutMs = options.timeoutMs ?? PROVIDER_REQUEST_TIMEOUT_MS;
  let lastResponse: Response | null = null;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(input, init, timeoutMs);
      lastResponse = response;

      if (!shouldRetryProviderResponse(response.status) || attempt === attempts - 1) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) {
        throw error;
      }
    }

    await wait(baseDelayMs * (attempt + 1));
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError instanceof Error ? lastError : new Error("PROVIDER_REQUEST_FAILED");
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
        Body: buildWhatsappMessage(kind, booking),
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type EmailCopy = { subject: string; heading: string; intro: string; ctaLabel: string };

function getEmailCopy(kind: NotificationKind, businessName: string): EmailCopy | null {
  const safeName = escapeHtml(businessName);
  switch (kind) {
    case "BOOKING_CREATED":
      return {
        subject: `Reserva recebida — ${businessName}`,
        heading: "Reserva recebida",
        intro: `Recebemos a tua reserva em <strong>${safeName}</strong>. Assim que for confirmada, voltamos a avisar-te por aqui.`,
        ctaLabel: "Gerir reserva",
      };
    case "BOOKING_CONFIRMED":
      return {
        subject: `Reserva confirmada — ${businessName}`,
        heading: "Reserva confirmada",
        intro: `Está tudo certo! A tua reserva em <strong>${safeName}</strong> está confirmada. Até já.`,
        ctaLabel: "Gerir reserva",
      };
    case "BOOKING_RESCHEDULED":
      return {
        subject: `Reserva remarcada — ${businessName}`,
        heading: "Reserva remarcada",
        intro: `A tua reserva em <strong>${safeName}</strong> foi remarcada para o horário abaixo.`,
        ctaLabel: "Gerir reserva",
      };
    case "BOOKING_CANCELLED":
      return {
        subject: `Reserva cancelada — ${businessName}`,
        heading: "Reserva cancelada",
        intro: `A tua reserva em <strong>${safeName}</strong> foi cancelada. Sempre que quiseres, podes marcar de novo.`,
        ctaLabel: "Marcar de novo",
      };
    default:
      // Kinds de staff/internas não enviam email ao cliente.
      return null;
  }
}

function buildEmailHtml(copy: EmailCopy, booking: BookingNotificationPayload, ctaUrl: string) {
  const when = format(booking.startsAt, "dd/MM/yyyy 'às' HH:mm");
  const professional = booking.staffMember?.fullName ?? "Sem preferência";
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">${label}</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;text-align:right;">${escapeHtml(value)}</td></tr>`;

  return `<!doctype html><html lang="pt"><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
<tr><td style="padding:28px 28px 8px 28px;">
<p style="margin:0 0 4px 0;font-size:13px;color:#9ca3af;letter-spacing:.04em;text-transform:uppercase;">${escapeHtml(booking.business.name)}</p>
<h1 style="margin:0;font-size:22px;color:#111827;">${copy.heading}</h1></td></tr>
<tr><td style="padding:8px 28px 0 28px;"><p style="margin:0;font-size:15px;line-height:1.5;color:#374151;">${copy.intro}</p></td></tr>
<tr><td style="padding:20px 28px 0 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:4px 16px;">
${row("Serviço", booking.service.name)}${row("Profissional", professional)}${row("Quando", when)}${row("Cliente", booking.customerName)}
</table></td></tr>
<tr><td style="padding:24px 28px 28px 28px;">
<a href="${ctaUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:10px;">${copy.ctaLabel}</a>
<p style="margin:16px 0 0 0;font-size:12px;color:#9ca3af;">Guarda este email para gerires a tua reserva quando precisares.</p></td></tr>
</table></td></tr></table></body></html>`;
}

function buildEmailContent(kind: NotificationKind, booking: BookingNotificationPayload) {
  const copy = getEmailCopy(kind, booking.business.name);
  if (!copy) return null;
  const ctaUrl = kind === "BOOKING_CANCELLED" ? buildPublicPageUrl(booking) : buildManageUrl(booking);
  return { subject: copy.subject, html: buildEmailHtml(copy, booking, ctaUrl) };
}

async function sendEmailForKind(
  booking: BookingNotificationPayload,
  kind: NotificationKind,
  recipient: string,
): Promise<DeliveryResult> {
  const content = buildEmailContent(kind, booking);
  if (!content) {
    await createSkippedNotification(booking, "EMAIL", kind, "EMAIL_KIND_NOT_SUPPORTED", recipient);
    return { channel: "EMAIL", status: "skipped", reason: "EMAIL_KIND_NOT_SUPPORTED" };
  }

  const reservation = await reserveNotificationDelivery({
    bookingId: booking.id,
    businessId: booking.business.id,
    channel: "EMAIL",
    kind,
    recipient,
  });
  if (reservation.duplicate) {
    return { channel: "EMAIL", status: "duplicate" };
  }

  const result = await sendEmail({ to: recipient, subject: content.subject, html: content.html });

  if (!result.ok && result.skipped) {
    await db.notificationLog.update({
      where: { id: reservation.logId },
      data: { status: "SKIPPED", errorMessage: result.reason },
    });
    return { channel: "EMAIL", status: "skipped", reason: result.reason };
  }
  if (!result.ok) {
    captureException("notification.email_failed", new Error(result.reason), {
      bookingId: booking.id,
      kind,
    });
    await db.notificationLog.update({
      where: { id: reservation.logId },
      data: { status: "FAILED", errorMessage: result.reason },
    });
    return { channel: "EMAIL", status: "failed", reason: result.reason };
  }

  await db.notificationLog.update({
    where: { id: reservation.logId },
    data: { status: "SENT", providerMessageId: result.id ?? undefined, sentAt: new Date() },
  });
  return { channel: "EMAIL", status: "sent" };
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

async function deliverWhatsappToCustomer(
  booking: BookingNotificationPayload,
  kind: NotificationKind,
): Promise<DeliveryResult> {
  if (!booking.customerPhone) {
    await createSkippedNotification(booking, "WHATSAPP", kind, "CUSTOMER_PHONE_MISSING");
    return { channel: "WHATSAPP", status: "skipped", reason: "CUSTOMER_PHONE_MISSING" };
  }
  return sendWhatsappForKind(booking, kind, booking.customerPhone);
}

async function deliverEmailToCustomer(
  booking: BookingNotificationPayload,
  kind: NotificationKind,
): Promise<DeliveryResult> {
  if (!booking.customerEmail) {
    await createSkippedNotification(booking, "EMAIL", kind, "CUSTOMER_EMAIL_MISSING");
    return { channel: "EMAIL", status: "skipped", reason: "CUSTOMER_EMAIL_MISSING" };
  }
  return sendEmailForKind(booking, kind, booking.customerEmail);
}

export async function sendBookingNotification(
  bookingId: string,
  kind: Exclude<
    NotificationKind,
    "BOOKING_STAFF_NEW_BOOKING" | "BOOKING_STAFF_PENDING_REQUEST"
  >,
) {
  const booking = await loadBookingNotificationPayload(bookingId);

  if (!booking) {
    return { status: "missing" as const, channels: [] as DeliveryResult[] };
  }

  // Confirmação ao cliente: email + WhatsApp em paralelo. Cada canal regista o
  // seu próprio NotificationLog e nenhum bloqueia o outro.
  const deliveries = await Promise.all([
    deliverWhatsappToCustomer(booking, kind),
    deliverEmailToCustomer(booking, kind),
  ]);

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
