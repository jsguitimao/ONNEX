import { afterEach, describe, expect, it } from "vitest";
import { authorizeCronRequest } from "@/lib/cron-auth";

describe("authorizeCronRequest", () => {
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("reports missing configuration when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    const req = new Request("https://example.com/api/cron/send-reminders");
    const result = authorizeCronRequest(req);
    expect(result.ok).toBe(false);
    expect(result.configured).toBe(false);
  });

  it("accepts valid secret in x-cron-secret header", () => {
    process.env.CRON_SECRET = "my-secret";
    const req = new Request("https://example.com/api/cron/send-reminders", {
      headers: { "x-cron-secret": "my-secret" },
    });
    const result = authorizeCronRequest(req);
    expect(result.ok).toBe(true);
    expect(result.source).toBe("header");
  });

  it("accepts valid secret in Authorization Bearer header", () => {
    process.env.CRON_SECRET = "my-secret";
    const req = new Request("https://example.com/api/cron/send-reminders", {
      headers: { authorization: "Bearer my-secret" },
    });
    const result = authorizeCronRequest(req);
    expect(result.ok).toBe(true);
    expect(result.source).toBe("bearer");
  });

  it("accepts valid secret in query parameter", () => {
    process.env.CRON_SECRET = "my-secret";
    const req = new Request("https://example.com/api/cron/send-reminders?secret=my-secret");
    const result = authorizeCronRequest(req);
    expect(result.ok).toBe(true);
    expect(result.source).toBe("query");
  });

  it("rejects invalid secrets", () => {
    process.env.CRON_SECRET = "correct-secret";
    const req = new Request("https://example.com/api/cron/send-reminders", {
      headers: { "x-cron-secret": "wrong-secret" },
    });
    const result = authorizeCronRequest(req);
    expect(result.ok).toBe(false);
    expect(result.configured).toBe(true);
  });

  it("detects Vercel cron user agent", () => {
    process.env.CRON_SECRET = "my-secret";
    const req = new Request("https://example.com/api/cron/send-reminders", {
      headers: {
        "x-cron-secret": "my-secret",
        "user-agent": "vercel-cron/1.0",
      },
    });
    const result = authorizeCronRequest(req);
    expect(result.isVercelCronUserAgent).toBe(true);
  });
});
