import { afterEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  autoCancelUnconfirmedBookings: vi.fn(async () => ({
    scanned: 0,
    cancelled: 0,
    advancementsSent: 0,
  })),
  sendUpcomingBookingReminders: vi.fn(async () => ({
    scanned: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  })),
  logReminderRunExecution: vi.fn(async () => {}),
  logWarning: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  autoCancelUnconfirmedBookings: h.autoCancelUnconfirmedBookings,
  sendUpcomingBookingReminders: h.sendUpcomingBookingReminders,
  logReminderRunExecution: h.logReminderRunExecution,
}));

vi.mock("@/lib/observability", () => ({
  logWarning: h.logWarning,
  captureException: h.captureException,
}));

import { GET, POST } from "@/app/api/cron/send-reminders/route";

afterEach(() => {
  delete process.env.CRON_SECRET;
  vi.clearAllMocks();
});

describe("/api/cron/send-reminders", () => {
  it("does not execute side effects on GET", async () => {
    process.env.CRON_SECRET = "secret";

    const response = await GET(
      new Request("https://example.com/api/cron/send-reminders", {
        headers: { "x-cron-secret": "secret" },
      }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(h.autoCancelUnconfirmedBookings).not.toHaveBeenCalled();
    expect(h.sendUpcomingBookingReminders).not.toHaveBeenCalled();
    expect(h.logReminderRunExecution).not.toHaveBeenCalled();
  });

  it("rejects POST requests that put the secret in the query string", async () => {
    process.env.CRON_SECRET = "secret";

    const response = await POST(
      new Request("https://example.com/api/cron/send-reminders?secret=secret", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(h.autoCancelUnconfirmedBookings).not.toHaveBeenCalled();
    expect(h.sendUpcomingBookingReminders).not.toHaveBeenCalled();
    expect(h.logReminderRunExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "CRON",
        status: "UNAUTHORIZED",
      }),
    );
  });
});
