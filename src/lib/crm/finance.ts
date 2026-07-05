import { db } from "@/lib/db";
import {
  getSafeTimeZone,
  getWeekDateKeys,
  getZonedDateKey,
  getZonedDayBounds,
} from "@/lib/timezone";

export type CrmFinancePeriod = "semanal" | "mensal" | "trimestral" | "custom";

export type CrmFinancialSummary = {
  totalCents: number;
  count: number;
  period: CrmFinancePeriod;
  rangeStart: string;
  rangeEnd: string;
  /** Mês escolhido (formato "YYYY-MM") quando period === "custom". */
  customMonth: string | null;
};

type DateRange = { start: Date; endExclusive: Date };

/** Bounds do mês civil (year, month=1..12) na timezone da barbearia. */
function monthBoundsFor(tz: string, year: number, month: number): DateRange | null {
  const startKey = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const endKey = `${String(nextMonthYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`;
  const startBounds = getZonedDayBounds(startKey, tz);
  const endBounds = getZonedDayBounds(endKey, tz);
  if (!startBounds || !endBounds) return null;
  return { start: startBounds.start, endExclusive: endBounds.start };
}

function getMonthBounds(timezone: string): DateRange | null {
  const tz = getSafeTimeZone(timezone);
  const today = getZonedDateKey(new Date(), tz);
  const [year, month] = today.split("-").map(Number);
  return monthBoundsFor(tz, year, month);
}

/** Trimestre civil atual (Jan-Mar, Abr-Jun, Jul-Set, Out-Dez). */
function getQuarterBounds(timezone: string): DateRange | null {
  const tz = getSafeTimeZone(timezone);
  const today = getZonedDateKey(new Date(), tz);
  const [year, month] = today.split("-").map(Number);
  const startMonth = Math.floor((month - 1) / 3) * 3 + 1;
  let endMonth = startMonth + 3;
  let endYear = year;
  if (endMonth > 12) {
    endMonth -= 12;
    endYear += 1;
  }
  const startRange = monthBoundsFor(tz, year, startMonth);
  const endRange = monthBoundsFor(tz, endYear, endMonth);
  if (!startRange || !endRange) return null;
  return { start: startRange.start, endExclusive: endRange.start };
}

/** Mês específico à escolha, formato "YYYY-MM". */
function getSpecificMonthBounds(timezone: string, monthKey: string): DateRange | null {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return monthBoundsFor(getSafeTimeZone(timezone), year, month);
}

function getCurrentWeekBounds(timezone: string): DateRange | null {
  const tz = getSafeTimeZone(timezone);
  const today = getZonedDateKey(new Date(), tz);
  const keys = getWeekDateKeys(today, 1);
  if (keys.length !== 7) return null;
  const startBounds = getZonedDayBounds(keys[0], tz);
  const endBounds = getZonedDayBounds(keys[6], tz);
  if (!startBounds || !endBounds) return null;
  return { start: startBounds.start, endExclusive: endBounds.endExclusive };
}

export async function computeFinancialSummary(
  businessId: string,
  options: {
    period: CrmFinancePeriod;
    staffMemberId?: string | null;
    timezone?: string | null;
    /** Mês escolhido (formato "YYYY-MM") — obrigatório quando period === "custom". */
    customMonth?: string | null;
  },
): Promise<CrmFinancialSummary> {
  const tz = getSafeTimeZone(options.timezone);
  const customMonth = options.period === "custom" ? options.customMonth ?? null : null;
  const range =
    options.period === "semanal"
      ? getCurrentWeekBounds(tz)
      : options.period === "trimestral"
      ? getQuarterBounds(tz)
      : options.period === "custom"
      ? (customMonth ? getSpecificMonthBounds(tz, customMonth) : null)
      : getMonthBounds(tz);

  if (!range) {
    return {
      totalCents: 0,
      count: 0,
      period: options.period,
      rangeStart: "",
      rangeEnd: "",
      customMonth,
    };
  }

  const aggregate = await db.booking.aggregate({
    where: {
      businessId,
      status: "COMPLETED",
      startsAt: { gte: range.start, lt: range.endExclusive },
      ...(options.staffMemberId ? { staffMemberId: options.staffMemberId } : {}),
    },
    _sum: { priceCents: true },
    _count: { _all: true },
  });

  return {
    totalCents: aggregate._sum.priceCents ?? 0,
    count: aggregate._count._all,
    period: options.period,
    rangeStart: range.start.toISOString(),
    rangeEnd: range.endExclusive.toISOString(),
    customMonth,
  };
}
