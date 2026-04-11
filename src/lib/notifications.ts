import type { Prisma } from "@prisma/client";
import { addMinutes, format } from "date-fns";
import { db } from "@/lib/db";

type NotificationKind = "BOOKING_CREATED" | "BOOKING_CONFIRMED" | "BOOKING_CANCELLED" | "BOOKING_REMINDER";

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
  };
  service: {
    name: string;
  };
  staffMember: {
    fullName: string;
  } | null;
};

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://buk-next.vercel.app";
}

function buildManageUrl(booking: BookingNotificationPayload) {
  return booking.publicToken ? `${getAppUrl()}/booking/${booking.publicToken}` : `${getAppUrl()}/${booking.business.slug}`;
}

function buildTemplate(kind: NotificationKind, booking: BookingNotificationPayload) {
  const when = `${format(booking.startsAt, "dd/MM/yyyy")} às ${format(booking.startsAt, "HH:mm")}`;
  const manageUrl = buildManageUrl(booking);
  const professional = booking.staffMember?.fullName ?? "equipa";

  switch (kind) {
    case "BOOKING_CREATED":
      return {
        subject: `Reserva recebida em ${booking.business.name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
            <h1 style="font-size:24px;margin-bottom:12px;">Recebemos a tua reserva</h1>
            <p>Olá ${booking.customerName}, a tua reserva para <strong>${booking.service.name}</strong> foi criada com sucesso.</p>
            <p><strong>Quando:</strong> ${when}<br /><strong>Profissional:</strong> ${professional}</p>
            <p>Podes confirmar ou cancelar a tua reserva neste link:</p>
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
            <p>Olá ${booking.customerName}, a tua reserva para <strong>${booking.service.name}</strong> está confirmada.</p>
            <p><strong>Quando:</strong> ${when}<br /><strong>Profissional:</strong> ${professional}</p>
            <p>Se precisares, podes gerir a tua reserva aqui:</p>
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
            <p>Se quiseres voltar a marcar, podes usar novamente a página pública do negócio.</p>
            <p><a href="${getAppUrl()}/${booking.business.slug}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;">Marcar novo horário</a></p>
          </div>
        `,
      };
    case "BOOKING_REMINDER":
      return {
        subject: `Lembrete da tua reserva em ${booking.business.name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
            <h1 style="font-size:24px;margin-bottom:12px;">Lembrete da tua reserva</h1>
            <p>Olá ${booking.customerName}, este é um lembrete para a tua reserva de <strong>${booking.service.name}</strong>.</p>
            <p><strong>Quando:</strong> ${when}<br /><strong>Profissional:</strong> ${professional}</p>
            <p>Se precisares de confirmar ou cancelar, usa este link:</p>
            <p><a href="${manageUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;">Gerir reserva</a></p>
          </div>
        `,
      };
  }
}

async function createNotificationLog(input: {
  bookingId: string;
  businessId: string;
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
      channel: "EMAIL",
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

export async function sendBookingNotification(bookingId: string, kind: NotificationKind) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      business: true,
      service: true,
      staffMember: true,
    },
  });

  if (!booking) {
    return { status: "missing" as const };
  }

  const recipient = booking.customerEmail;
  if (!recipient) {
    await createNotificationLog({
      bookingId: booking.id,
      businessId: booking.businessId,
      kind,
      recipient: "",
      status: "SKIPPED",
      errorMessage: "CUSTOMER_EMAIL_MISSING",
    });
    return { status: "skipped" as const, reason: "CUSTOMER_EMAIL_MISSING" };
  }

  const existing = await db.notificationLog.findFirst({
    where: {
      bookingId: booking.id,
      channel: "EMAIL",
      kind,
      status: "SENT",
    },
  });

  if (existing) {
    return { status: "duplicate" as const };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const template = buildTemplate(kind, booking);

  if (!apiKey || !from) {
    await createNotificationLog({
      bookingId: booking.id,
      businessId: booking.businessId,
      kind,
      recipient,
      status: "SKIPPED",
      errorMessage: "EMAIL_PROVIDER_NOT_CONFIGURED",
      payload: { subject: template.subject },
    });
    return { status: "skipped" as const, reason: "EMAIL_PROVIDER_NOT_CONFIGURED" };
  }

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

  const payload = (await response.json()) as { id?: string; message?: string; name?: string };

  if (!response.ok) {
    await createNotificationLog({
      bookingId: booking.id,
      businessId: booking.businessId,
      kind,
      recipient,
      status: "FAILED",
      errorMessage: payload.message ?? payload.name ?? "EMAIL_SEND_FAILED",
      payload,
    });
    return { status: "failed" as const, reason: payload.message ?? "EMAIL_SEND_FAILED" };
  }

  await createNotificationLog({
    bookingId: booking.id,
    businessId: booking.businessId,
    kind,
    recipient,
    status: "SENT",
    providerMessageId: payload.id,
    payload,
    sentAt: new Date(),
  });

  return { status: "sent" as const };
}

export async function sendUpcomingBookingReminders(input?: {
  reminderStartMinutes?: number;
  reminderEndMinutes?: number;
}) {
  const reminderStartMinutes = input?.reminderStartMinutes ?? 90;
  const reminderEndMinutes = input?.reminderEndMinutes ?? 150;
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
      customerEmail: {
        not: null,
      },
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
