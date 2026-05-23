import { beforeEach, describe, expect, it, vi } from "vitest";

// Regista todas as chamadas a `db.booking.findMany` para podermos inspecionar
// o `where` exato que chega à base de dados. O CVE cross-tenant vivia aqui:
// `fetchUpcomingBookings` nunca filtrava por `businessId`, por isso o trigger
// manual do CRM varria reservas de TODOS os negócios. `findMany` devolve []
// de propósito — só queremos provar o scoping da query, sem disparar o
// caminho de envio (Twilio/notificationLog).
const h = vi.hoisted(() => {
  const findManyCalls: Array<Record<string, unknown>> = [];
  const db = {
    booking: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        findManyCalls.push(where);
        return [];
      }),
    },
  };
  return {
    db,
    findManyCalls,
    reset() {
      findManyCalls.length = 0;
    },
  };
});

vi.mock("@/lib/db", () => ({ db: h.db }));
vi.mock("@/lib/app-config", () => ({ getAppUrl: () => "https://example.test" }));
vi.mock("@/lib/observability", () => ({ captureException: vi.fn(), logWarning: vi.fn() }));
vi.mock("@/lib/crm/automation", () => ({
  DEFAULT_AUTOMATION: {
    reminderEnabled: true,
    reminderMinutesBefore: 30,
    confirmationToleranceMinutes: 10,
  },
  getBusinessAutomation: vi.fn(async () => ({
    reminderEnabled: true,
    reminderMinutesBefore: 30,
    confirmationToleranceMinutes: 10,
  })),
  getBusinessAutomationMap: vi.fn(async () => new Map()),
}));

import {
  autoCancelUnconfirmedBookings,
  sendUpcomingBookingReminders,
} from "@/lib/notifications";

beforeEach(() => {
  h.reset();
  vi.clearAllMocks();
});

describe("trigger de lembretes é scoped ao negócio (CVE cross-tenant)", () => {
  it("sendUpcomingBookingReminders SEM businessId varre todos os negócios (cron global)", async () => {
    await sendUpcomingBookingReminders();

    expect(h.findManyCalls).toHaveLength(1);
    // Cron global: a query NÃO pode ter filtro de negócio.
    expect(h.findManyCalls[0]).not.toHaveProperty("businessId");
  });

  it("sendUpcomingBookingReminders COM businessId só toca no negócio da sessão", async () => {
    await sendUpcomingBookingReminders("biz-a");

    expect(h.findManyCalls).toHaveLength(1);
    expect(h.findManyCalls[0].businessId).toBe("biz-a");
  });

  it("autoCancelUnconfirmedBookings SEM businessId varre todos os negócios (cron global)", async () => {
    await autoCancelUnconfirmedBookings();

    expect(h.findManyCalls).toHaveLength(1);
    expect(h.findManyCalls[0]).not.toHaveProperty("businessId");
  });

  it("autoCancelUnconfirmedBookings COM businessId só cancela no negócio da sessão", async () => {
    await autoCancelUnconfirmedBookings("biz-a");

    expect(h.findManyCalls).toHaveLength(1);
    expect(h.findManyCalls[0].businessId).toBe("biz-a");
    // E mantém os restantes filtros de auto-cancel (não confirmados + lembrete enviado).
    expect(h.findManyCalls[0].customerConfirmedAt).toBeNull();
    expect(h.findManyCalls[0].notifications).toBeDefined();
  });
});
