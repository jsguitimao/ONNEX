import { addDays, set } from "date-fns";

const DEFAULT_BOOKING_POLICY = {
  bookingLeadTimeHours: 1,
  bookingWindowDays: 30,
  slotIntervalMinutes: 30,
  cancellationWindowHours: 2,
};

export function clampInteger(value: number | null | undefined, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

export function getBookingPolicySettings(business: {
  bookingLeadTimeHours?: number | null;
  bookingWindowDays?: number | null;
  slotIntervalMinutes?: number | null;
  cancellationWindowHours?: number | null;
}) {
  return {
    bookingLeadTimeHours: clampInteger(
      business.bookingLeadTimeHours,
      0,
      168,
      DEFAULT_BOOKING_POLICY.bookingLeadTimeHours
    ),
    bookingWindowDays: clampInteger(
      business.bookingWindowDays,
      1,
      365,
      DEFAULT_BOOKING_POLICY.bookingWindowDays
    ),
    slotIntervalMinutes: clampInteger(
      business.slotIntervalMinutes,
      5,
      120,
      DEFAULT_BOOKING_POLICY.slotIntervalMinutes
    ),
    cancellationWindowHours: clampInteger(
      business.cancellationWindowHours,
      0,
      168,
      DEFAULT_BOOKING_POLICY.cancellationWindowHours
    ),
  };
}

export function getBookableRange(business: {
  bookingLeadTimeHours?: number | null;
  bookingWindowDays?: number | null;
}) {
  const policy = getBookingPolicySettings(business);
  const now = new Date();
  const minBookableAt = new Date(now.getTime() + policy.bookingLeadTimeHours * 60 * 60_000);
  const maxBookableAt = set(addDays(now, policy.bookingWindowDays), {
    hours: 23,
    minutes: 59,
    seconds: 59,
    milliseconds: 999,
  });

  return {
    ...policy,
    now,
    minBookableAt,
    maxBookableAt,
  };
}

export function getCancellationDeadline(
  startsAt: Date,
  business: { cancellationWindowHours?: number | null }
) {
  const { cancellationWindowHours } = getBookingPolicySettings(business);
  return new Date(startsAt.getTime() - cancellationWindowHours * 60 * 60_000);
}
