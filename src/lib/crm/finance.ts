import { db } from "@/lib/db";
import {
  getSafeTimeZone,
  getWeekDateKeys,
  getZonedDateKey,
  getZonedDayBounds,
} from "@/lib/timezone";

export type CrmFinancePeriod = "semanal" | "mensal";

export type CrmFinancialSummary = {
  totalCents: number;
  count: number;
  period: CrmFinancePeriod;
  rangeStart: string;
  rangeEnd: string;
};

type DateRange = { start: Date; endExclusive: Date };

function getMonthBounds(timezone: string): DateRange | null {
  const tz = getSafeTimeZone(timezone);
  const today = getZonedDateKey(new Date(), tz);
  const [year, month] = today.split("-").map(Number);
  const startKey = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const endKey = `${String(nextMonthYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`;
  const startBounds = getZonedDayBounds(startKey, tz);
  const endBounds = getZonedDayBounds(endKey, tz);
  if (!startBounds || !endBounds) return null;
  return { start: startBounds.start, endExclusive: endBounds.start };
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
  },
): Promise<CrmFinancialSummary> {
  const tz = getSafeTimeZone(options.timezone);
  const range =
    options.period === "semanal" ? getCurrentWeekBounds(tz) : getMonthBounds(tz);

  if (!range) {
    return {
      totalCents: 0,
      count: 0,
      period: options.period,
      rangeStart: "",
      rangeEnd: "",
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
  };
}
