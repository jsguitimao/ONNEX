import { describe, expect, it } from "vitest";
import {
  clampInteger,
  getBookableRange,
  getBookingPolicySettings,
  getCancellationDeadline,
} from "@/lib/booking-policy";

describe("clampInteger", () => {
  it("returns fallback for null/undefined", () => {
    expect(clampInteger(null, 0, 100, 50)).toBe(50);
    expect(clampInteger(undefined, 0, 100, 50)).toBe(50);
  });

  it("returns fallback for NaN", () => {
    expect(clampInteger(NaN, 0, 100, 50)).toBe(50);
  });

  it("clamps below minimum", () => {
    expect(clampInteger(-10, 0, 100, 50)).toBe(0);
  });

  it("clamps above maximum", () => {
    expect(clampInteger(999, 0, 100, 50)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clampInteger(7.6, 0, 100, 50)).toBe(8);
  });

  it("passes valid values through", () => {
    expect(clampInteger(42, 0, 100, 50)).toBe(42);
  });
});

describe("getBookingPolicySettings", () => {
  it("returns defaults when all values are null", () => {
    const policy = getBookingPolicySettings({});
    expect(policy.bookingLeadTimeHours).toBe(1);
    expect(policy.bookingWindowDays).toBe(30);
    expect(policy.slotIntervalMinutes).toBe(30);
    expect(policy.cancellationWindowHours).toBe(2);
  });

  it("clamps invalid values into safe limits", () => {
    const policy = getBookingPolicySettings({
      bookingLeadTimeHours: -5,
      bookingWindowDays: 999,
      slotIntervalMinutes: 2,
      cancellationWindowHours: 500,
    });
    expect(policy.bookingLeadTimeHours).toBe(0);
    expect(policy.bookingWindowDays).toBe(365);
    expect(policy.slotIntervalMinutes).toBe(5);
    expect(policy.cancellationWindowHours).toBe(168);
  });

  it("accepts valid custom values", () => {
    const policy = getBookingPolicySettings({
      bookingLeadTimeHours: 4,
      bookingWindowDays: 14,
      slotIntervalMinutes: 15,
      cancellationWindowHours: 24,
    });
    expect(policy.bookingLeadTimeHours).toBe(4);
    expect(policy.bookingWindowDays).toBe(14);
    expect(policy.slotIntervalMinutes).toBe(15);
    expect(policy.cancellationWindowHours).toBe(24);
  });
});

describe("getBookableRange", () => {
  it("returns a valid booking window with min before max", () => {
    const range = getBookableRange({
      bookingLeadTimeHours: 2,
      bookingWindowDays: 15,
    });
    expect(range.minBookableAt.getTime()).toBeLessThan(range.maxBookableAt.getTime());
    expect(range.bookingLeadTimeHours).toBe(2);
    expect(range.bookingWindowDays).toBe(15);
  });

  it("lead time of 0 means bookable from now", () => {
    const before = Date.now();
    const range = getBookableRange({ bookingLeadTimeHours: 0 });
    const after = Date.now();
    expect(range.minBookableAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(range.minBookableAt.getTime()).toBeLessThanOrEqual(after + 1);
  });
});

describe("getCancellationDeadline", () => {
  it("subtracts cancellation window from start time", () => {
    const startsAt = new Date("2026-04-20T14:00:00Z");
    const deadline = getCancellationDeadline(startsAt, { cancellationWindowHours: 2 });
    expect(deadline.toISOString()).toBe("2026-04-20T12:00:00.000Z");
  });

  it("uses default when cancellationWindowHours is null", () => {
    const startsAt = new Date("2026-04-20T14:00:00Z");
    const deadline = getCancellationDeadline(startsAt, {});
    expect(deadline.toISOString()).toBe("2026-04-20T12:00:00.000Z");
  });
});
