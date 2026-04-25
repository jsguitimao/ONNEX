const DATE_PART_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getFormatter(timeZone: string) {
  const cached = DATE_PART_FORMATTER_CACHE.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  DATE_PART_FORMATTER_CACHE.set(timeZone, formatter);
  return formatter;
}

function parseDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { year, month, day };
}

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = getFormatter(timeZone).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return zonedAsUtc - date.getTime();
}

export function getSafeTimeZone(timeZone: string | null | undefined) {
  const candidate = timeZone?.trim() || "Europe/Lisbon";

  try {
    getFormatter(candidate).format(new Date());
    return candidate;
  } catch {
    return "Europe/Lisbon";
  }
}

export function zonedTimeToUtc(dateKey: string, timeValue: string, timeZone: string) {
  const parsedDate = parseDateKey(dateKey);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(timeValue);

  if (!parsedDate || !timeMatch) return null;

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? 0);

  if (hour > 23 || minute > 59 || second > 59) return null;

  let utcMs = Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day, hour, minute, second);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const offset = getTimeZoneOffsetMs(new Date(utcMs), timeZone);
    utcMs = Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day, hour, minute, second) - offset;
  }

  return new Date(utcMs);
}

export function getZonedDayBounds(dateKey: string, timeZone: string) {
  const start = zonedTimeToUtc(dateKey, "00:00:00", timeZone);
  const nextDay = addDaysToDateKey(dateKey, 1);
  const endExclusive = nextDay ? zonedTimeToUtc(nextDay, "00:00:00", timeZone) : null;

  if (!start || !endExclusive) return null;

  return {
    start,
    endExclusive,
  };
}

export function getZonedDateKey(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

export function getZonedTimeValue(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function getDayOfWeekForDateKey(dateKey: string) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;

  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));
  return date.toISOString().slice(0, 10);
}

export function getWeekDateKeys(dateKey: string, weekStartsOn = 1) {
  const dayOfWeek = getDayOfWeekForDateKey(dateKey);
  if (dayOfWeek === null) return [];

  const offset = (dayOfWeek - weekStartsOn + 7) % 7;
  const weekStart = addDaysToDateKey(dateKey, -offset);
  if (!weekStart) return [];

  return Array.from({ length: 7 }, (_, index) => addDaysToDateKey(weekStart, index)).filter(
    (value): value is string => Boolean(value)
  );
}

