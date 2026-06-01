import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const h = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: h.transaction,
  },
}));

import { assertSlotAvailable, runBookingTransaction } from "@/lib/booking-transaction";

describe("runBookingTransaction", () => {
  it("maps Prisma serializable transaction conflicts to a controlled booking error", async () => {
    h.transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Transaction conflict", {
        code: "P2034",
        clientVersion: "test",
      }),
    );

    await expect(runBookingTransaction(async () => "ok")).rejects.toThrow("HORARIO_OCUPADO");
  });
});

describe("assertSlotAvailable", () => {
  const input = {
    businessId: "biz_1",
    staffMemberId: "staff_1",
    startsAt: new Date("2026-06-01T10:00:00.000Z"),
    endsAt: new Date("2026-06-01T10:30:00.000Z"),
  };

  it("rejects overlapping bookings within the same business and staff member", async () => {
    const tx = {
      booking: {
        findFirst: vi.fn(async () => ({ id: "booking_1" })),
      },
      scheduleBlock: {
        findFirst: vi.fn(async () => null),
      },
    };

    await expect(assertSlotAvailable(tx as never, input)).rejects.toThrow("HORARIO_OCUPADO");
    expect(tx.booking.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        businessId: "biz_1",
        staffMemberId: "staff_1",
        startsAt: { lt: input.endsAt },
        endsAt: { gt: input.startsAt },
      }),
      select: { id: true },
    });
    expect(tx.scheduleBlock.findFirst).not.toHaveBeenCalled();
  });

  it("rejects overlapping business-wide or staff schedule blocks", async () => {
    const tx = {
      booking: {
        findFirst: vi.fn(async () => null),
      },
      scheduleBlock: {
        findFirst: vi.fn(async () => ({ id: "block_1" })),
      },
    };

    await expect(assertSlotAvailable(tx as never, input)).rejects.toThrow("HORARIO_BLOQUEADO");
    expect(tx.scheduleBlock.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        businessId: "biz_1",
        OR: [{ staffMemberId: "staff_1" }, { staffMemberId: null }],
        startsAt: { lt: input.endsAt },
        endsAt: { gt: input.startsAt },
      }),
      select: { id: true },
    });
  });

  it("allows free slots", async () => {
    const tx = {
      booking: {
        findFirst: vi.fn(async () => null),
      },
      scheduleBlock: {
        findFirst: vi.fn(async () => null),
      },
    };

    await expect(assertSlotAvailable(tx as never, input)).resolves.toBeUndefined();
  });
});
