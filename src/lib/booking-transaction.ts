import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type BookingTxClient = Prisma.TransactionClient;

export async function runBookingTransaction<T>(fn: (tx: BookingTxClient) => Promise<T>): Promise<T> {
  try {
    return await db.$transaction(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 15_000,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2034" || error.code === "40001")
    ) {
      throw new Error("HORARIO_OCUPADO");
    }
    throw error;
  }
}

type SlotCheckInput = {
  businessId: string;
  staffMemberId: string;
  startsAt: Date;
  endsAt: Date;
  excludeBookingId?: string;
};

export async function assertSlotAvailable(tx: BookingTxClient, input: SlotCheckInput) {
  const conflict = await tx.booking.findFirst({
    where: {
      businessId: input.businessId,
      staffMemberId: input.staffMemberId,
      ...(input.excludeBookingId ? { id: { not: input.excludeBookingId } } : {}),
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt },
    },
    select: { id: true },
  });

  if (conflict) {
    throw new Error("HORARIO_OCUPADO");
  }

  const blocked = await tx.scheduleBlock.findFirst({
    where: {
      businessId: input.businessId,
      OR: [{ staffMemberId: input.staffMemberId }, { staffMemberId: null }],
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt },
    },
    select: { id: true },
  });

  if (blocked) {
    throw new Error("HORARIO_BLOQUEADO");
  }
}
