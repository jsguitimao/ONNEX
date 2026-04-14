import type { Prisma } from "@prisma/client";
import { addMinutes, format } from "date-fns";
import { getAppUrl, getEmailFrom } from "./app-config";
import { db } from "./db";
import { captureException } from "./observability";

type NotificationKind =
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_CANCELLED_INTERNAL"
  | "BOOKING_RESCHEDULED"
  | "BOOKING_REMINDER";

type NotificationChannel = "EMAIL" | "SMS";

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
    contactEmail: string | null;
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
  } | null;
};

type NotificationTemplate = {
  subject: string;
  preview: string;
  html: string;
  text: string;
};

function buildManageUrl(booking: BookingNotificationPayload) {
  return booking.publicToken ? `${getAppUrl()}/booking/${booking.publicToken}` : `${getAppUrl()}/${booking.business.slug}`;
}

function buildPublicPageUrl(booking: BookingNotificationPayload) {
  return `${getAppUrl()}/${booking.business.slug}`;
}

function getRepresentativeEmailRecipient(booking: BookingNotificationPayload) {
  return booking.business.contactEmail || booking.business.owner.email;
}

function getRepresentativeSmsRecipient(booking: BookingNotificationPayload) {
  return booking.business.contactPhone;
}

function buildEmailShell(input: {
  preview: string;
  eyebrow: string;
  title: string;
  body: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  muted?: string;
  footer?: string[];
}) {
  const bodyHtml = input.body.map((paragraph) => `<p style="margin:0 0 14px;line-height:1.7;">${paragraph}</p>`).join("");
  const ctaHtml =
    input.ctaLabel && input.ctaUrl
      ? `<p style="margin:24px 0 0;"><a href="${input.ctaUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:600;">${input.ctaLabel}</a></p>`
      : "";
  const mutedHtml = input.muted
    ? `<p style="margin:18px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">${input.muted}</p>`
    : "";
  const footerHtml =
    input.footer && input.footer.length > 0
      ? `<div style="margin-top:24px;padding-top:18px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;line-height:1.7;">${input.footer
          .map((line) => `<p style="margin:0 0 8px;">${line}</p>`)
          .join("")}</div>`
      : "";

  return `
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">
      ${input.preview}
    </div>
    <div style="background:#f5f7fb;padding:32px 16px;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden;">
        <div style="padding:28px 28px 18px;background:linear-gradient(135deg,#111827 0%,#1f2937 100%);color:#ffffff;">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.76;">${input.eyebrow}</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;">${input.title}</h1>
        </div>
        <div style="padding:24px 28px 28px;">
          ${bodyHtml}
          ${ctaHtml}
          ${mutedHtml}
          ${footerHtml}
        </div>
      </div>
    </div>
  `;
}

function buildTextTemplate(input: {
  title: string;
  body: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string[];
}) {
  const sections = [input.title, "", ...input.body];

  if (input.ctaLabel && input.ctaUrl) {
    sections.push("", `${input.ctaLabel}: ${input.ctaUrl}`);
  }

  if (input.footer && input.footer.length > 0) {
    sections.push("", ...input.footer);
  }

  return sections.join("\n");
}

function buildTemplate(kind: NotificationKind, booking: BookingNotificationPayload): NotificationTemplate {
  const when = `${format(booking.startsAt, "dd/MM/yyyy")} às ${format(booking.startsAt, "HH:mm")}`;
  const manageUrl = buildManageUrl(booking);
  const publicPageUrl = buildPublicPageUrl(booking);
  const professional = booking.staffMember?.fullName ?? "equipa";
  const representativeName = booking.business.owner.firstName || booking.business.name;
  const contactLines = [
    booking.business.contactEmail ? `Email: ${booking.business.contactEmail}` : null,
    booking.business.contactPhone ? `Telefone: ${booking.business.contactPhone}` : null,
  ].filter((value): value is string => Boolean(value));

  switch (kind) {
    case "BOOKING_CREATED":
      return {
        subject: `Recebemos a tua reserva em ${booking.business.name}`,
        preview: `${booking.service.name} a ${when} com ${professional}.`,
        html: buildEmailShell({
          preview: `${booking.service.name} a ${when} com ${professional}.`,
          eyebrow: "Nova reserva",
          title: "Recebemos a tua reserva",
          body: [
            `Olá ${booking.customerName}, a tua reserva para <strong>${booking.service.name}</strong> foi registada com sucesso.`,
            `<strong>Quando:</strong> ${when}<br /><strong>Profissional:</strong> ${professional}`,
            "Se precisares, podes acompanhar, confirmar ou cancelar no link abaixo.",
          ],
          ctaLabel: "Gerir reserva",
          ctaUrl: manageUrl,
          muted: `Barbearia: ${booking.business.name}`,
          footer: contactLines,
        }),
        text: buildTextTemplate({
          title: "Recebemos a tua reserva",
          body: [
            `Olá ${booking.customerName}, a tua reserva para ${booking.service.name} foi registada com sucesso.`,
            `Quando: ${when}`,
            `Profissional: ${professional}`,
            "Se precisares, podes acompanhar, confirmar ou cancelar no link abaixo.",
          ],
          ctaLabel: "Gerir reserva",
          ctaUrl: manageUrl,
          footer: contactLines,
        }),
      };
    case "BOOKING_CONFIRMED":
      return {
        subject: `Reserva confirmada em ${booking.business.name}`,
        preview: `${booking.service.name} confirmada para ${when}.`,
        html: buildEmailShell({
          preview: `${booking.service.name} confirmada para ${when}.`,
          eyebrow: "Reserva confirmada",
          title: "Está tudo confirmado",
          body: [
            `Olá ${booking.customerName}, a tua reserva para <strong>${booking.service.name}</strong> está confirmada.`,
            `<strong>Quando:</strong> ${when}<br /><strong>Profissional:</strong> ${professional}`,
            "Guarda este link para consultar os detalhes sempre que precisares.",
          ],
          ctaLabel: "Ver reserva",
          ctaUrl: manageUrl,
          muted: `Barbearia: ${booking.business.name}`,
          footer: contactLines,
        }),
        text: buildTextTemplate({
          title: "Está tudo confirmado",
          body: [
            `Olá ${booking.customerName}, a tua reserva para ${booking.service.name} está confirmada.`,
            `Quando: ${when}`,
            `Profissional: ${professional}`,
            "Guarda este link para consultar os detalhes sempre que precisares.",
          ],
          ctaLabel: "Ver reserva",
          ctaUrl: manageUrl,
          footer: contactLines,
        }),
      };
    case "BOOKING_CANCELLED":
      return {
        subject: `Reserva cancelada em ${booking.business.name}`,
        preview: `A tua reserva de ${booking.service.name} foi cancelada.`,
        html: buildEmailShell({
          preview: `A tua reserva de ${booking.service.name} foi cancelada.`,
          eyebrow: "Reserva cancelada",
          title: "A tua reserva foi cancelada",
          body: [
            `Olá ${booking.customerName}, a tua reserva para <strong>${booking.service.name}</strong> foi cancelada.`,
            "Se quiseres marcar novamente, a página pública da barbearia continua disponível.",
          ],
          ctaLabel: "Marcar novo horário",
          ctaUrl: publicPageUrl,
          muted: `Barbearia: ${booking.business.name}`,
          footer: contactLines,
        }),
        text: buildTextTemplate({
          title: "A tua reserva foi cancelada",
          body: [
            `Olá ${booking.customerName}, a tua reserva para ${booking.service.name} foi cancelada.`,
            "Se quiseres marcar novamente, a página pública da barbearia continua disponível.",
          ],
          ctaLabel: "Marcar novo horário",
          ctaUrl: publicPageUrl,
          footer: contactLines,
        }),
      };
    case "BOOKING_CANCELLED_INTERNAL":
      return {
        subject: `Cancelamento recebido: ${booking.customerName}`,
        preview: `${booking.customerName} cancelou ${booking.service.name} de ${when}.`,
        html: buildEmailShell({
          preview: `${booking.customerName} cancelou ${booking.service.name} de ${when}.`,
          eyebrow: "Operação",
          title: "Cancelamento de reserva",
          body: [
            `Olá ${representativeName}, a reserva abaixo foi cancelada pelo cliente ou pelo painel.`,
            `<strong>Cliente:</strong> ${booking.customerName}<br /><strong>Serviço:</strong> ${booking.service.name}<br /><strong>Quando:</strong> ${when}<br /><strong>Profissional:</strong> ${professional}`,
            "Podes reabrir a agenda ou acompanhar a reserva no link abaixo.",
          ],
          ctaLabel: "Ver reserva",
          ctaUrl: manageUrl,
          muted: `Barbearia: ${booking.business.name}`,
          footer: contactLines,
        }),
        text: buildTextTemplate({
          title: "Cancelamento de reserva",
          body: [
            `Olá ${representativeName}, a reserva abaixo foi cancelada pelo cliente ou pelo painel.`,
            `Cliente: ${booking.customerName}`,
            `Serviço: ${booking.service.name}`,
            `Quando: ${when}`,
            `Profissional: ${professional}`,
          ],
          ctaLabel: "Ver reserva",
          ctaUrl: manageUrl,
          footer: contactLines,
        }),
      };
    case "BOOKING_RESCHEDULED":
      return {
        subject: `Reserva remarcada em ${booking.business.name}`,
        preview: `Novo horário definido para ${when}.`,
        html: buildEmailShell({
          preview: `Novo horário definido para ${when}.`,
          eyebrow: "Reserva remarcada",
          title: "Atualizámos a tua reserva",
          body: [
            `Olá ${booking.customerName}, a tua reserva para <strong>${booking.service.name}</strong> foi atualizada.`,
            `<strong>Novo horário:</strong> ${when}<br /><strong>Profissional:</strong> ${professional}`,
            "Podes rever os detalhes sempre que precisares.",
          ],
          ctaLabel: "Ver reserva",
          ctaUrl: manageUrl,
          muted: `Barbearia: ${booking.business.name}`,
          footer: contactLines,
        }),
        text: buildTextTemplate({
          title: "Atualizámos a tua reserva",
          body: [
            `Olá ${booking.customerName}, a tua reserva para ${booking.service.name} foi atualizada.`,
            `Novo horário: ${when}`,
            `Profissional: ${professional}`,
            "Podes rever os detalhes sempre que precisares.",
          ],
          ctaLabel: "Ver reserva",
          ctaUrl: manageUrl,
          footer: contactLines,
        }),
      };
    case "BOOKING_REMINDER":
      return {
        subject: "Lembrete: faltam 30 minutos para a tua reserva",
        preview: `${booking.service.name} começa em cerca de 30 minutos.`,
        html: buildEmailShell({
          preview: `${booking.service.name} começa em cerca de 30 minutos.`,
          eyebrow: "Lembrete",
          title: "Está quase na hora",
          body: [
            `Olá ${booking.customerName}, faltam cerca de 30 minutos para a tua reserva de <strong>${booking.service.name}</strong>.`,
            `<strong>Quando:</strong> ${when}<br /><strong>Profissional:</strong> ${professional}`,
            "Se precisares de rever os detalhes, usa este link.",
          ],
          ctaLabel: "Gerir reserva",
          ctaUrl: manageUrl,
          muted: `Barbearia: ${booking.business.name}`,
          footer: contactLines,
        }),
        text: buildTextTemplate({
          title: "Está quase na hora",
          body: [
            `Olá ${booking.customerName}, faltam cerca de 30 minutos para a tua reserva de ${booking.service.name}.`,
            `Quando: ${when}`,
            `Profissional: ${professional}`,
            "Se precisares de rever os detalhes, usa este link.",
          ],
          ctaLabel: "Gerir reserva",
          ctaUrl: manageUrl,
          footer: contactLines,
        }),
      };
  }
}

function buildSmsMessage(kind: NotificationKind, booking: BookingNotificationPayload) {
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
      return `Cancelamento recebido: ${booking.customerName} cancelou ${booking.service.name} a ${when}. Ver: ${manageUrl}`;
    case "BOOKING_RESCHEDULED":
      return `Reserva remarcada em ${booking.business.name}: novo horário ${when} com ${professional}. ${manageUrl}`;
    case "BOOKING_REMINDER":
      return `Lembrete: faltam cerca de 30 minutos para ${booking.service.name} em ${booking.business.name}. ${manageUrl}`;
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

async function findExistingSentNotification(input: {
  bookingId: string;
  channel: NotificationChannel;
  kind: NotificationKind;
  recipient: string;
}) {
  return db.notificationLog.findFirst({
    where: {
      bookingId: input.bookingId,
      channel: input.channel,
      kind: input.kind,
      recipient: input.recipient,
      status: "SENT",
    },
  });
}

async function createSkippedNotification(
  booking: BookingNotificationPayload,
  channel: NotificationChannel,
  kind: NotificationKind,
  reason: string,
  recipient = ""
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
  options: {
    attempts?: number;
    baseDelayMs?: number;
  } = {}
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

async function sendEmailForKind(booking: BookingNotificationPayload, kind: NotificationKind, recipient: string) {
  const existing = await findExistingSentNotification({
    bookingId: booking.id,
    channel: "EMAIL",
    kind,
    recipient,
  });

  if (existing) {
    return { channel: "EMAIL", status: "duplicate" } satisfies DeliveryResult;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = getEmailFrom();
  const template = buildTemplate(kind, booking);

  if (!apiKey || !from) {
    await createSkippedNotification(booking, "EMAIL", kind, "EMAIL_PROVIDER_NOT_CONFIGURED", recipient);
    return { channel: "EMAIL", status: "skipped", reason: "EMAIL_PROVIDER_NOT_CONFIGURED" } satisfies DeliveryResult;
  }

  try {
    const response = await fetchWithProviderRetry("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipient,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }),
    });

    const payload = await safeReadJson(response);

    if (!response.ok) {
      await createNotificationLog({
        bookingId: booking.id,
        businessId: booking.business.id,
        channel: "EMAIL",
        kind,
        recipient,
        status: "FAILED",
        errorMessage: String(payload.message ?? payload.name ?? "EMAIL_SEND_FAILED"),
        payload: payload as Prisma.InputJsonValue,
      });

      return { channel: "EMAIL", status: "failed", reason: String(payload.message ?? "EMAIL_SEND_FAILED") } satisfies DeliveryResult;
    }

    await createNotificationLog({
      bookingId: booking.id,
      businessId: booking.business.id,
      channel: "EMAIL",
      kind,
      recipient,
      status: "SENT",
      providerMessageId: typeof payload.id === "string" ? payload.id : undefined,
      payload: payload as Prisma.InputJsonValue,
      sentAt: new Date(),
    });

    return { channel: "EMAIL", status: "sent" } satisfies DeliveryResult;
  } catch (error) {
    captureException("notification.email_failed", error, {
      bookingId: booking.id,
      kind,
      recipient,
    });

    await createNotificationLog({
      bookingId: booking.id,
      businessId: booking.business.id,
      channel: "EMAIL",
      kind,
      recipient,
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : "EMAIL_SEND_FAILED",
    });

    return {
      channel: "EMAIL",
      status: "failed",
      reason: error instanceof Error ? error.message : "EMAIL_SEND_FAILED",
    } satisfies DeliveryResult;
  }
}

async function sendSmsForKind(booking: BookingNotificationPayload, kind: NotificationKind, recipient: string) {
  const existing = await findExistingSentNotification({
    bookingId: booking.id,
    channel: "SMS",
    kind,
    recipient,
  });

  if (existing) {
    return { channel: "SMS", status: "duplicate" } satisfies DeliveryResult;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim();

  if (!accountSid || !authToken || !fromNumber) {
    await createSkippedNotification(booking, "SMS", kind, "SMS_PROVIDER_NOT_CONFIGURED", recipient);
    return { channel: "SMS", status: "skipped", reason: "SMS_PROVIDER_NOT_CONFIGURED" } satisfies DeliveryResult;
  }

  try {
    const response = await fetchWithProviderRetry(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: recipient,
        From: fromNumber,
        Body: buildSmsMessage(kind, booking),
      }).toString(),
    });

    const payload = await safeReadJson(response);

    if (!response.ok) {
      await createNotificationLog({
        bookingId: booking.id,
        businessId: booking.business.id,
        channel: "SMS",
        kind,
        recipient,
        status: "FAILED",
        errorMessage: String(payload.message ?? payload.code ?? "SMS_SEND_FAILED"),
        payload: payload as Prisma.InputJsonValue,
      });

      return { channel: "SMS", status: "failed", reason: String(payload.message ?? "SMS_SEND_FAILED") } satisfies DeliveryResult;
    }

    await createNotificationLog({
      bookingId: booking.id,
      businessId: booking.business.id,
      channel: "SMS",
      kind,
      recipient,
      status: "SENT",
      providerMessageId: typeof payload.sid === "string" ? payload.sid : undefined,
      payload: payload as Prisma.InputJsonValue,
      sentAt: new Date(),
    });

    return { channel: "SMS", status: "sent" } satisfies DeliveryResult;
  } catch (error) {
    captureException("notification.sms_failed", error, {
      bookingId: booking.id,
      kind,
      recipient,
    });

    await createNotificationLog({
      bookingId: booking.id,
      businessId: booking.business.id,
      channel: "SMS",
      kind,
      recipient,
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : "SMS_SEND_FAILED",
    });

    return {
      channel: "SMS",
      status: "failed",
      reason: error instanceof Error ? error.message : "SMS_SEND_FAILED",
    } satisfies DeliveryResult;
  }
}

function summarizeDeliveries(results: DeliveryResult[]) {
  if (results.some((result) => result.status === "sent")) {
    return {
      status: "sent" as const,
      channels: results,
    };
  }

  if (results.some((result) => result.status === "failed")) {
    return {
      status: "failed" as const,
      channels: results,
    };
  }

  if (results.some((result) => result.status === "duplicate")) {
    return {
      status: "duplicate" as const,
      channels: results,
    };
  }

  return {
    status: "skipped" as const,
    channels: results,
  };
}

export async function sendBookingNotification(bookingId: string, kind: Exclude<NotificationKind, "BOOKING_CANCELLED_INTERNAL">) {
  const booking = await loadBookingNotificationPayload(bookingId);

  if (!booking) {
    return { status: "missing" as const, channels: [] as DeliveryResult[] };
  }

  const deliveries: DeliveryResult[] = [];

  if (booking.customerEmail) {
    deliveries.push(await sendEmailForKind(booking, kind, booking.customerEmail));
  } else {
    await createSkippedNotification(booking, "EMAIL", kind, "CUSTOMER_EMAIL_MISSING");
  }

  if (booking.customerPhone) {
    deliveries.push(await sendSmsForKind(booking, kind, booking.customerPhone));
  } else {
    await createSkippedNotification(booking, "SMS", kind, "CUSTOMER_PHONE_MISSING");
  }

  return summarizeDeliveries(deliveries);
}

export async function sendRepresentativeBookingNotification(
  bookingId: string,
  kind: Extract<NotificationKind, "BOOKING_CANCELLED_INTERNAL">
) {
  const booking = await loadBookingNotificationPayload(bookingId);

  if (!booking) {
    return { status: "missing" as const, channels: [] as DeliveryResult[] };
  }

  const deliveries: DeliveryResult[] = [];
  const emailRecipient = getRepresentativeEmailRecipient(booking);
  const smsRecipient = getRepresentativeSmsRecipient(booking);

  if (emailRecipient) {
    deliveries.push(await sendEmailForKind(booking, kind, emailRecipient));
  } else {
    await createSkippedNotification(booking, "EMAIL", kind, "REPRESENTATIVE_EMAIL_MISSING");
  }

  if (smsRecipient) {
    deliveries.push(await sendSmsForKind(booking, kind, smsRecipient));
  } else {
    await createSkippedNotification(booking, "SMS", kind, "REPRESENTATIVE_PHONE_MISSING");
  }

  return summarizeDeliveries(deliveries);
}

export async function retryNotificationDelivery(input: {
  bookingId: string;
  channel: NotificationChannel;
  kind: NotificationKind;
}) {
  const booking = await loadBookingNotificationPayload(input.bookingId);

  if (!booking) {
    return { status: "missing" as const };
  }

  if (input.kind === "BOOKING_CANCELLED_INTERNAL") {
    if (input.channel === "EMAIL") {
      const recipient = getRepresentativeEmailRecipient(booking);

      if (!recipient) {
        await createSkippedNotification(booking, "EMAIL", input.kind, "REPRESENTATIVE_EMAIL_MISSING");
        return { status: "skipped" as const, channel: "EMAIL" as const };
      }

      return await sendEmailForKind(booking, input.kind, recipient);
    }

    const recipient = getRepresentativeSmsRecipient(booking);

    if (!recipient) {
      await createSkippedNotification(booking, "SMS", input.kind, "REPRESENTATIVE_PHONE_MISSING");
      return { status: "skipped" as const, channel: "SMS" as const };
    }

    return await sendSmsForKind(booking, input.kind, recipient);
  }

  if (input.channel === "EMAIL") {
    if (!booking.customerEmail) {
      await createSkippedNotification(booking, "EMAIL", input.kind, "CUSTOMER_EMAIL_MISSING");
      return { status: "skipped" as const, channel: "EMAIL" as const };
    }

    return await sendEmailForKind(booking, input.kind, booking.customerEmail);
  }

  if (!booking.customerPhone) {
    await createSkippedNotification(booking, "SMS", input.kind, "CUSTOMER_PHONE_MISSING");
    return { status: "skipped" as const, channel: "SMS" as const };
  }

  return await sendSmsForKind(booking, input.kind, booking.customerPhone);
}

export async function sendUpcomingBookingReminders(input?: {
  reminderStartMinutes?: number;
  reminderEndMinutes?: number;
}) {
  const reminderStartMinutes = input?.reminderStartMinutes ?? 25;
  const reminderEndMinutes = input?.reminderEndMinutes ?? 35;
  const windowStart = addMinutes(new Date(), reminderStartMinutes);
  const windowEnd = addMinutes(new Date(), reminderEndMinutes);

  const bookings = await db.booking.findMany({
    where: {
      startsAt: {
        gte: windowStart,
        lte: windowEnd,
      },
      status: {
        in: ["PENDING", "CONFIRMED"],
      },
      OR: [{ customerEmail: { not: null } }, { customerPhone: { not: null } }],
    },
    select: {
      id: true,
    },
  });

  const results = await Promise.all(bookings.map((booking) => sendBookingNotification(booking.id, "BOOKING_REMINDER")));

  return {
    scanned: bookings.length,
    sent: results.filter((result) => result.status === "sent").length,
    skipped: results.filter((result) => result.status === "skipped" || result.status === "duplicate").length,
    failed: results.filter((result) => result.status === "failed").length,
    reminderStartMinutes,
    reminderEndMinutes,
  };
}
