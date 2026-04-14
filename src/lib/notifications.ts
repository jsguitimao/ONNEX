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

function buildTemplate(kind: NotificationKind, booking: BookingNotificationPayload) {
  const when = `${format(booking.startsAt, "dd/MM/yyyy")} as ${format(booking.startsAt, "HH:mm")}`;
  const manageUrl = buildManageUrl(booking);
  const publicPageUrl = buildPublicPageUrl(booking);
  const professional = booking.staffMember?.fullName ?? "equipa";
  const representativeName = booking.business.owner.firstName || booking.business.name;

  switch (kind) {
    case "BOOKING_CREATED":
      return {
        subject: `Recebemos a tua reserva em ${booking.business.name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
            <h1 style="font-size:24px;margin-bottom:12px;">Recebemos a tua reserva</h1>
            <p>Olá ${booking.customerName}, a tua reserva para <strong>${booking.service.name}</strong> foi registada com sucesso.</p>
            <p><strong>Quando:</strong> ${when}<br /><strong>Profissional:</strong> ${professional}</p>
            <p>Se precisares, podes acompanhar, confirmar ou cancelar no link abaixo.</p>
            <p><a href="${manageUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;">Gerir reserva</a></p>
          </div>
        `,
      };
    case "BOOKING_CONFIRMED":
      return {
        subject: `Reserva confirmada em ${booking.business.name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
            <h1 style="font-size:24px;margin-bottom:12px;">Reserva confirmada</h1>
            <p>Olá ${booking.customerName}, a tua reserva para <strong>${booking.service.name}</strong> esta confirmada.</p>
            <p><strong>Quando:</strong> ${when}<br /><strong>Profissional:</strong> ${professional}</p>
            <p>Guarda este link para consultar os detalhes sempre que precisares.</p>
            <p><a href="${manageUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;">Ver reserva</a></p>
          </div>
        `,
      };
    case "BOOKING_CANCELLED":
      return {
        subject: `Reserva cancelada em ${booking.business.name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
            <h1 style="font-size:24px;margin-bottom:12px;">Reserva cancelada</h1>
            <p>Olá ${booking.customerName}, a tua reserva para <strong>${booking.service.name}</strong> foi cancelada.</p>
            <p>Se quiseres marcar novamente, a página pública continua disponível.</p>
            <p><a href="${publicPageUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;">Marcar novo horario</a></p>
          </div>
        `,
      };
    case "BOOKING_CANCELLED_INTERNAL":
      return {
        subject: `Cancelamento recebido: ${booking.customerName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
            <h1 style="font-size:24px;margin-bottom:12px;">Cancelamento de reserva</h1>
            <p>Olá ${representativeName}, a reserva abaixo foi cancelada pelo cliente ou pelo painel.</p>
            <p><strong>Cliente:</strong> ${booking.customerName}<br /><strong>Serviço:</strong> ${booking.service.name}<br /><strong>Quando:</strong> ${when}<br /><strong>Profissional:</strong> ${professional}</p>
            <p>Podes reabrir a agenda ou acompanhar a reserva no link abaixo.</p>
            <p><a href="${manageUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;">Ver reserva</a></p>
          </div>
        `,
      };
    case "BOOKING_RESCHEDULED":
      return {
        subject: `Reserva remarcada em ${booking.business.name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
            <h1 style="font-size:24px;margin-bottom:12px;">Reserva remarcada</h1>
            <p>Olá ${booking.customerName}, a tua reserva para <strong>${booking.service.name}</strong> foi atualizada.</p>
            <p><strong>Novo horario:</strong> ${when}<br /><strong>Profissional:</strong> ${professional}</p>
            <p>Podes rever os detalhes sempre que precisares.</p>
            <p><a href="${manageUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;">Ver reserva</a></p>
          </div>
        `,
      };
    case "BOOKING_REMINDER":
      return {
        subject: `Lembrete: faltam 30 minutos para a tua reserva`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
            <h1 style="font-size:24px;margin-bottom:12px;">O teu horario esta quase a chegar</h1>
            <p>Olá ${booking.customerName}, faltam cerca de 30 minutos para a tua reserva de <strong>${booking.service.name}</strong>.</p>
            <p><strong>Quando:</strong> ${when}<br /><strong>Profissional:</strong> ${professional}</p>
            <p>Se precisares de rever os detalhes, usa este link:</p>
            <p><a href="${manageUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;">Gerir reserva</a></p>
          </div>
        `,
      };
  }
}

function buildSmsMessage(kind: NotificationKind, booking: BookingNotificationPayload) {
  const when = `${format(booking.startsAt, "dd/MM HH:mm")}`;
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
      return `Reserva remarcada em ${booking.business.name}: novo horario ${when} com ${professional}. ${manageUrl}`;
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
    const response = await fetch("https://api.resend.com/emails", {
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
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
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
