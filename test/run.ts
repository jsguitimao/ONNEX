import assert from "node:assert/strict";
import { getBookableRange, getBookingPolicySettings } from "../src/lib/booking-policy.ts";
import { authorizeCronRequest } from "../src/lib/cron-auth.ts";
import {
  normalizeCustomerEmail,
  normalizeCustomerPhone,
  sanitizeBookingCustomerInput,
} from "../src/lib/customer-identity.ts";
import { getPublicBookingTokenExpiresAt, isPublicBookingTokenExpired } from "../src/lib/public-booking-token.ts";
import {
  consumeRateLimit,
  getClientIp,
  resetRateLimitStoreForTests,
} from "../src/lib/rate-limit.ts";
import { normalizeOnboardingDraft, onboardingSchema } from "../src/lib/onboarding-input.ts";
import { validatePublicMutationOrigin } from "../src/lib/request-origin.ts";

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
    run: async () => {
      resetRateLimitStoreForTests();

      const first = await consumeRateLimit({
        namespace: "tests:block",
        identifier: "127.0.0.1",
        limit: 2,
        windowMs: 60_000,
        now: 1_000,
      });
      const second = await consumeRateLimit({
        namespace: "tests:block",
        identifier: "127.0.0.1",
        limit: 2,
        windowMs: 60_000,
        now: 1_100,
      });
      const third = await consumeRateLimit({
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
    run: async () => {
      resetRateLimitStoreForTests();

      await consumeRateLimit({
        namespace: "tests:reset",
        identifier: "127.0.0.1",
        limit: 1,
        windowMs: 5_000,
        now: 10_000,
      });

      const afterWindow = await consumeRateLimit({
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
  {
    name: "validatePublicMutationOrigin accepts same-origin browser requests",
    run: () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://buk-next.vercel.app";

      const request = new Request("https://buk-next.vercel.app/api/public/demo/bookings", {
        method: "POST",
        headers: {
          origin: "https://buk-next.vercel.app",
          referer: "https://buk-next.vercel.app/demo",
          "sec-fetch-site": "same-origin",
        },
      });

      const result = validatePublicMutationOrigin(request);

      assert.equal(result.ok, true);
      assert.equal(result.reason, null);
    },
  },
  {
    name: "validatePublicMutationOrigin rejects cross-site mutation attempts",
    run: () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://buk-next.vercel.app";

      const request = new Request("https://buk-next.vercel.app/api/public/demo/bookings", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          referer: "https://evil.example/form",
          "sec-fetch-site": "cross-site",
        },
      });

      const result = validatePublicMutationOrigin(request);

      assert.equal(result.ok, false);
      assert.equal(result.reason, "ORIGIN_NOT_ALLOWED");
    },
  },
  {
    name: "public booking token expires 30 days after the latest booking anchor",
    run: () => {
      const endsAt = new Date("2026-04-14T10:00:00.000Z");
      const updatedAt = new Date("2026-04-16T12:30:00.000Z");

      const expiresAt = getPublicBookingTokenExpiresAt({ endsAt, updatedAt });

      assert.equal(expiresAt.toISOString(), "2026-05-16T12:30:00.000Z");
      assert.equal(isPublicBookingTokenExpired({ endsAt, updatedAt }, new Date("2026-05-16T12:29:59.000Z")), false);
      assert.equal(isPublicBookingTokenExpired({ endsAt, updatedAt }, new Date("2026-05-16T12:30:01.000Z")), true);
    },
  },
  {
    name: "onboarding normalization accepts trimmed emails and bare URLs",
    run: () => {
      const normalized = normalizeOnboardingDraft({
        businessName: "  Buk Barbearia  ",
        slug: "  Minha_Barbearia  ",
        city: " Lisboa ",
        phone: " 912345678 ",
        contactEmail: "  DONO@EXAMPLE.COM ",
        websiteUrl: "bukbarbearia.com",
        instagramUrl: "instagram.com/bukbarbearia",
        description: "  Barbearia premium no centro de Lisboa.  ",
        headline: "  Reserva online em segundos  ",
        subheadline: "  Marca corte, barba e atendimento premium sem telefonemas.  ",
        welcomeMessage: "  Bem-vindo. Escolhe o serviço e o teu barbeiro favorito.  ",
        primaryColor: "#111827",
        accentColor: "#c084fc",
        logoUrl: "cdn.example.com/logo.png",
        coverImageUrl: "images.example.com/capa.jpg",
        heroImageUrl: "",
        aboutImages: [],
        servicesImages: [],
        teamImages: [],
        sobreColor: "#F59E0B",
        servicosColor: "#F59E0B",
        equipaColor: "#F59E0B",
        localizacaoColor: "#F59E0B",
        reservaColor: "#F59E0B",
        heroTagline: "  Barbearia · Lisboa  ",
        textColor: "#ffffff",
        onlineBooking: true,
        showTeam: true,
        showPrices: true,
        showDurations: true,
        bookingLeadTimeHours: 2,
        bookingWindowDays: 30,
        slotIntervalMinutes: 15,
        cancellationWindowHours: 4,
      });

      assert.equal(normalized.slug, "minha-barbearia");
      assert.equal(normalized.contactEmail, "dono@example.com");
      assert.equal(normalized.websiteUrl, "https://bukbarbearia.com");
      assert.equal(normalized.logoUrl, "https://cdn.example.com/logo.png");
      assert.equal(normalized.accentColor, "#C084FC");
    },
  },
  {
    name: "onboarding schema parses normalized optional URLs successfully",
    run: () => {
      const parsed = onboardingSchema.parse({
        businessName: "Buk Barbearia",
        slug: "Meu_Slug",
        city: "Lisboa",
        phone: "912345678",
        contactEmail: " contacto@example.com ",
        websiteUrl: "bukbarbearia.com",
        instagramUrl: "",
        description: "Barbearia com cortes, barba e experiência premium.",
        headline: "Reserva online simples",
        subheadline: "Agenda o teu horário em menos de um minuto, sem chamadas nem esperas.",
        welcomeMessage: "Escolhe o serviço, o profissional e confirma a marcação.",
        primaryColor: "#111827",
        accentColor: "#C084FC",
        logoUrl: "",
        coverImageUrl: "",
        heroImageUrl: "",
        aboutImages: [],
        servicesImages: [],
        teamImages: [],
        sobreColor: "#F59E0B",
        servicosColor: "#F59E0B",
        equipaColor: "#F59E0B",
        localizacaoColor: "#F59E0B",
        reservaColor: "#F59E0B",
        heroTagline: "",
        textColor: "#FFFFFF",
        onlineBooking: true,
        showTeam: true,
        showPrices: true,
        showDurations: true,
        bookingLeadTimeHours: 0,
        bookingWindowDays: 30,
        slotIntervalMinutes: 15,
        cancellationWindowHours: 4,
      });

      assert.equal(parsed.slug, "meu-slug");
      assert.equal(parsed.contactEmail, "contacto@example.com");
      assert.equal(parsed.websiteUrl, "https://bukbarbearia.com");
    },
  },
  {
    name: "onboarding schema accepts empty phone and description for progressive setup",
    run: () => {
      const parsed = onboardingSchema.parse({
        businessName: "Buk Barbearia",
        slug: "buk-barbearia",
        city: "Lisboa",
        phone: "   ",
        contactEmail: "",
        websiteUrl: "",
        instagramUrl: "",
        description: "   ",
        headline: "Reserva online simples",
        subheadline: "Agenda o teu horário em menos de um minuto, sem chamadas nem esperas.",
        welcomeMessage: "Escolhe o serviço, o profissional e confirma a marcação.",
        primaryColor: "#111827",
        accentColor: "#C084FC",
        logoUrl: "",
        coverImageUrl: "",
        heroImageUrl: "",
        aboutImages: [],
        servicesImages: [],
        teamImages: [],
        sobreColor: "#F59E0B",
        servicosColor: "#F59E0B",
        equipaColor: "#F59E0B",
        localizacaoColor: "#F59E0B",
        reservaColor: "#F59E0B",
        heroTagline: "",
        textColor: "",
        onlineBooking: true,
        showTeam: true,
        showPrices: true,
        showDurations: true,
        bookingLeadTimeHours: 0,
        bookingWindowDays: 30,
        slotIntervalMinutes: 15,
        cancellationWindowHours: 4,
      });

      assert.equal(parsed.phone, "");
      assert.equal(parsed.description, "");
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
