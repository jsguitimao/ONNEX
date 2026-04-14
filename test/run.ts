import assert from "node:assert/strict";
import { getBookableRange, getBookingPolicySettings } from "../src/lib/booking-policy.ts";
import { authorizeCronRequest } from "../src/lib/cron-auth.ts";
import {
  normalizeCustomerEmail,
  normalizeCustomerPhone,
  sanitizeBookingCustomerInput,
} from "../src/lib/customer-identity.ts";
import {
  consumeRateLimit,
  getClientIp,
  resetRateLimitStoreForTests,
} from "../src/lib/rate-limit.ts";

type TestCase = {
  name: string;
  run: () => void | Promise<void>;
};

const tests: TestCase[] = [
  {
    name: "customer identity normalizes email and phone safely",
    run: () => {
      assert.equal(normalizeCustomerEmail("  CLIENTE@Example.COM "), "cliente@example.com");
      assert.equal(normalizeCustomerPhone(" +351 912-345-678 "), "+351912345678");
      assert.equal(normalizeCustomerPhone("  "), null);
    },
  },
  {
    name: "sanitizeBookingCustomerInput preserves a safe fallback name",
    run: () => {
      const sanitized = sanitizeBookingCustomerInput({
        fullName: "   ",
        email: undefined,
        phone: undefined,
      });

      assert.equal(sanitized.fullName, "Cliente");
      assert.equal(sanitized.email, null);
      assert.equal(sanitized.phone, null);
    },
  },
  {
    name: "consumeRateLimit blocks requests above the configured limit",
    run: () => {
      resetRateLimitStoreForTests();

      const first = consumeRateLimit({
        namespace: "tests:block",
        identifier: "127.0.0.1",
        limit: 2,
        windowMs: 60_000,
        now: 1_000,
      });
      const second = consumeRateLimit({
        namespace: "tests:block",
        identifier: "127.0.0.1",
        limit: 2,
        windowMs: 60_000,
        now: 1_100,
      });
      const third = consumeRateLimit({
        namespace: "tests:block",
        identifier: "127.0.0.1",
        limit: 2,
        windowMs: 60_000,
        now: 1_200,
      });

      assert.equal(first.ok, true);
      assert.equal(second.ok, true);
      assert.equal(third.ok, false);
      assert.equal(third.remaining, 0);
    },
  },
  {
    name: "consumeRateLimit resets after the configured window",
    run: () => {
      resetRateLimitStoreForTests();

      consumeRateLimit({
        namespace: "tests:reset",
        identifier: "127.0.0.1",
        limit: 1,
        windowMs: 5_000,
        now: 10_000,
      });

      const afterWindow = consumeRateLimit({
        namespace: "tests:reset",
        identifier: "127.0.0.1",
        limit: 1,
        windowMs: 5_000,
        now: 15_100,
      });

      assert.equal(afterWindow.ok, true);
      assert.equal(afterWindow.count, 1);
    },
  },
  {
    name: "getClientIp prefers Cloudflare and forwarded headers",
    run: () => {
      const request = new Request("https://example.com", {
        headers: {
          "cf-connecting-ip": "198.51.100.10",
          "x-forwarded-for": "203.0.113.4, 203.0.113.5",
        },
      });

      assert.equal(getClientIp(request), "198.51.100.10");
    },
  },
  {
    name: "getBookingPolicySettings clamps invalid values into safe limits",
    run: () => {
      const policy = getBookingPolicySettings({
        bookingLeadTimeHours: -5,
        bookingWindowDays: 999,
        slotIntervalMinutes: 2,
        cancellationWindowHours: 500,
      });

      assert.equal(policy.bookingLeadTimeHours, 0);
      assert.equal(policy.bookingWindowDays, 365);
      assert.equal(policy.slotIntervalMinutes, 5);
      assert.equal(policy.cancellationWindowHours, 168);
    },
  },
  {
    name: "getBookableRange returns a valid booking window",
    run: () => {
      const range = getBookableRange({
        bookingLeadTimeHours: 2,
        bookingWindowDays: 15,
      });

      assert.equal(range.bookingLeadTimeHours, 2);
      assert.equal(range.bookingWindowDays, 15);
      assert.equal(range.maxBookableAt > range.minBookableAt, true);
    },
  },
  {
    name: "authorizeCronRequest accepts the shared secret in the custom header",
    run: () => {
      process.env.CRON_SECRET = "super-secret";

      const request = new Request("https://example.com/api/cron/send-reminders", {
        headers: {
          "x-cron-secret": "super-secret",
          "user-agent": "vercel-cron/1.0",
        },
      });

      const result = authorizeCronRequest(request);

      assert.equal(result.ok, true);
      assert.equal(result.configured, true);
      assert.equal(result.source, "header");
      assert.equal(result.isVercelCronUserAgent, true);
    },
  },
  {
    name: "authorizeCronRequest rejects invalid secrets",
    run: () => {
      process.env.CRON_SECRET = "correct-secret";

      const request = new Request("https://example.com/api/cron/send-reminders?secret=wrong-secret", {
        headers: {
          authorization: "Bearer wrong-secret",
        },
      });

      const result = authorizeCronRequest(request);

      assert.equal(result.ok, false);
      assert.equal(result.configured, true);
      assert.equal(result.source, null);
    },
  },
  {
    name: "authorizeCronRequest reports missing configuration",
    run: () => {
      delete process.env.CRON_SECRET;

      const request = new Request("https://example.com/api/cron/send-reminders");
      const result = authorizeCronRequest(request);

      assert.equal(result.ok, false);
      assert.equal(result.configured, false);
    },
  },
];

async function main() {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.run();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`PASS ${tests.length} tests`);
}

void main();
