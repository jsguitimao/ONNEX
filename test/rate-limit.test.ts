import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeRateLimit,
  getClientIp,
  resetRateLimitStoreForTests,
} from "@/lib/rate-limit";

describe("getClientIp", () => {
  it("prefers cf-connecting-ip", () => {
    const req = new Request("https://example.com", {
      headers: {
        "cf-connecting-ip": "198.51.100.10",
        "x-forwarded-for": "203.0.113.4",
      },
    });
    expect(getClientIp(req)).toBe("198.51.100.10");
  });

  it("falls back to x-forwarded-for first entry", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.4, 203.0.113.5" },
    });
    expect(getClientIp(req)).toBe("203.0.113.4");
  });

  it("returns anonymous when no headers", () => {
    const req = new Request("https://example.com");
    expect(getClientIp(req)).toBe("anonymous");
  });
});

describe("consumeRateLimit", () => {
  beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  it("allows requests within limit", async () => {
    const first = await consumeRateLimit({
      namespace: "test:allow",
      identifier: "127.0.0.1",
      limit: 3,
      windowMs: 60_000,
      now: 1_000,
    });
    expect(first.ok).toBe(true);
    expect(first.remaining).toBe(2);
  });

  it("blocks requests above limit", async () => {
    for (let i = 0; i < 2; i++) {
      await consumeRateLimit({
        namespace: "test:block",
        identifier: "127.0.0.1",
        limit: 2,
        windowMs: 60_000,
        now: 1_000 + i,
      });
    }

    const blocked = await consumeRateLimit({
      namespace: "test:block",
      identifier: "127.0.0.1",
      limit: 2,
      windowMs: 60_000,
      now: 1_200,
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after window expires", async () => {
    await consumeRateLimit({
      namespace: "test:reset",
      identifier: "127.0.0.1",
      limit: 1,
      windowMs: 5_000,
      now: 10_000,
    });

    const afterWindow = await consumeRateLimit({
      namespace: "test:reset",
      identifier: "127.0.0.1",
      limit: 1,
      windowMs: 5_000,
      now: 15_100,
    });
    expect(afterWindow.ok).toBe(true);
    expect(afterWindow.count).toBe(1);
  });

  it("isolates different identifiers", async () => {
    await consumeRateLimit({
      namespace: "test:isolate",
      identifier: "user-a",
      limit: 1,
      windowMs: 60_000,
      now: 1_000,
    });

    const userB = await consumeRateLimit({
      namespace: "test:isolate",
      identifier: "user-b",
      limit: 1,
      windowMs: 60_000,
      now: 1_000,
    });
    expect(userB.ok).toBe(true);
  });
});
