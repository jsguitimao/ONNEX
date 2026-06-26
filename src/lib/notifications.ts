import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { getAppUrl } from "./app-config";
import { db } from "./db";
import { sendEmail } from "./email";
import { sendWhatsappTemplate } from "./whatsapp";
import { captureException } from "./observability";

type NotificationKind =
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_RESCHEDULED";

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
    whatsappPhoneNumberId: string | null;
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

// Aceita só números em E.164 (`+CCNNNN...`). Sem `+`, a Cloud API pode interpretar
// mal o destinatário; exigimos o formato canónico para não registar como enviado
// algo que afinal não chega.
function isValidWhatsappRecipient(value: string) {
  const trimmed = value.trim().replace(/^whatsapp:/, "");
  return /^\+[1-9]\d{6,14}$/.test(trimmed);
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
      // Tipo sem email definido — não envia nada ao cliente.
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

// Mensagens ao cliente via WhatsApp Cloud API. Só os tipos com template aprovado
// na Meta podem ser enviados (regra da Meta). Por agora: confirmação de reserva.
// O lembrete (lembrete_marcacao) será disparado pelo agendador, não por aqui.
const WHATSAPP_TEMPLATES: Partial<
  Record<NotificationKind, { name: string; build: (booking: BookingNotificationPayload) => string[] }>
> = {
  BOOKING_CONFIRMED: {
    name: "reserva_confirmada",
    build: (booking) => [
      booking.customerName,
      booking.business.name,
      format(booking.startsAt, "dd/MM 'às' HH:mm"),
    ],
  },
};

async function sendWhatsappTemplateForKind(
  booking: BookingNotificationPayload,
  kind: NotificationKind,
  recipient: string,
): Promise<DeliveryResult> {
  const template = WHATSAPP_TEMPLATES[kind];
  if (!template) {
    await createNotificationLog({
      bookingId: booking.id,
      businessId: booking.business.id,
      channel: "WHATSAPP",
      kind,
      recipient,
      status: "SKIPPED",
      errorMessage: "WHATSAPP_KIND_NO_TEMPLATE",
    });
    return { channel: "WHATSAPP", status: "skipped", reason: "WHATSAPP_KIND_NO_TEMPLATE" };
  }

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
    return { channel: "WHATSAPP", status: "skipped", reason: "WHATSAPP_RECIPIENT_INVALID_FORMAT" };
  }

  const phoneNumberId = booking.business.whatsappPhoneNumberId?.trim() || null;
  if (!phoneNumberId) {
    await createNotificationLog({
      bookingId: booking.id,
      businessId: booking.business.id,
      channel: "WHATSAPP",
      kind,
      recipient,
      status: "SKIPPED",
      errorMessage: "WHATSAPP_BUSINESS_NOT_CONNECTED",
    });
    return { channel: "WHATSAPP", status: "skipped", reason: "WHATSAPP_BUSINESS_NOT_CONNECTED" };
  }

  const reservation = await reserveNotificationDelivery({
    bookingId: booking.id,
    businessId: booking.business.id,
    channel: "WHATSAPP",
    kind,
    recipient,
  });
  if (reservation.duplicate) {
    return { channel: "WHATSAPP", status: "duplicate" };
  }

  const result = await sendWhatsappTemplate({
    phoneNumberId,
    to: recipient.trim().replace(/^whatsapp:/, ""),
    template: template.name,
    variables: template.build(booking),
    languageCode: "pt_PT",
  });

  if (!result.ok && result.skipped) {
    await db.notificationLog.update({
      where: { id: reservation.logId },
      data: { status: "SKIPPED", errorMessage: result.reason },
    });
    return { channel: "WHATSAPP", status: "skipped", reason: result.reason };
  }
  if (!result.ok) {
    captureException("notification.whatsapp_failed", new Error(result.reason), {
      bookingId: booking.id,
      kind,
    });
    await db.notificationLog.update({
      where: { id: reservation.logId },
      data: { status: "FAILED", errorMessage: result.reason },
    });
    return { channel: "WHATSAPP", status: "failed", reason: result.reason };
  }

  await db.notificationLog.update({
    where: { id: reservation.logId },
    data: { status: "SENT", providerMessageId: result.id ?? undefined, sentAt: new Date() },
  });
  return { channel: "WHATSAPP", status: "sent" };
}

async function deliverWhatsappToCustomer(
  booking: BookingNotificationPayload,
  kind: NotificationKind,
): Promise<DeliveryResult> {
  if (!booking.customerPhone) {
    await createSkippedNotification(booking, "WHATSAPP", kind, "CUSTOMER_PHONE_MISSING");
    return { channel: "WHATSAPP", status: "skipped", reason: "CUSTOMER_PHONE_MISSING" };
  }
  return sendWhatsappTemplateForKind(booking, kind, booking.customerPhone);
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
  kind: NotificationKind,
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
