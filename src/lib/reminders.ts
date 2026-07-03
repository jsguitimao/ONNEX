// Agendador de lembretes de marcação. Corre periodicamente (via cron externo que
// chama /api/cron/send-reminders) e envia o lembrete WhatsApp aos clientes cuja
// marcação CONFIRMED está a entrar na janela de antecedência (REMINDER_LEAD_MINUTES).
//
// Idempotente por natureza: `sendBookingReminder` regista no NotificationLog com
// kind=BOOKING_REMINDER; se o lembrete já foi enviado (ou está em curso), o dedupe
// devolve "duplicate" e não reenvia. Assim, correr o cron de X em X minutos é seguro
// — cada reserva só recebe um lembrete, no primeiro tick após entrar na janela.
//
// O scan (status CONFIRMED + customerPhone não nulo + janela de startsAt) é coberto
// pelo índice parcial `Booking_reminder_scan_idx`, por isso é barato à escala.

import { db } from "./db";
import { sendBookingReminder } from "./notifications";
import { captureException } from "./observability";

const DEFAULT_REMINDER_LEAD_MINUTES = 180; // 3 horas antes
const MAX_PER_RUN = 200; // teto de segurança por execução

function getLeadMinutes(): number {
  const raw = Number(process.env.REMINDER_LEAD_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_REMINDER_LEAD_MINUTES;
}

export type SendDueRemindersResult = {
  leadMinutes: number;
  scanned: number;
  sent: number;
  duplicate: number;
  skipped: number;
  failed: number;
};

export async function sendDueReminders(): Promise<SendDueRemindersResult> {
  const leadMinutes = getLeadMinutes();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + leadMinutes * 60_000);

  // Marcações CONFIRMED com telefone, cujo início cai entre agora e a janela de
  // antecedência (ainda não começaram). As já lembradas são filtradas pelo dedupe.
  const bookings = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      customerPhone: { not: null },
      startsAt: { gt: now, lte: windowEnd },
    },
    orderBy: { startsAt: "asc" },
    select: { id: true },
    take: MAX_PER_RUN,
  });

  let sent = 0;
  let duplicate = 0;
  let skipped = 0;
  let failed = 0;

  for (const booking of bookings) {
    try {
      const result = await sendBookingReminder(booking.id);
      switch (result.status) {
        case "sent":
          sent++;
          break;
        case "duplicate":
          duplicate++;
          break;
        case "failed":
          failed++;
          break;
        default:
          skipped++;
          break;
      }
    } catch (error) {
      failed++;
      captureException("reminders.send_failed", error, { bookingId: booking.id });
    }
  }

  return { leadMinutes, scanned: bookings.length, sent, duplicate, skipped, failed };
}
