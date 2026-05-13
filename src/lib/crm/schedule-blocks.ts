import { db } from "@/lib/db";
import {
  getSafeTimeZone,
  getZonedDayBounds,
  zonedTimeToUtc,
} from "@/lib/timezone";

export type CrmScheduleBlockKind = "all_day" | "time_range";

export type CrmScheduleBlockInput = {
  staffMemberId: string | null;
  kind: CrmScheduleBlockKind;
  startDateKey: string;
  endDateKey: string;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
};

export type CrmScheduleBlockRow = {
  id: string;
  staffMemberId: string | null;
  staffMemberName: string | null;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
};

export type CrmScheduleBlockRowDto = {
  id: string;
  staffMemberId: string | null;
  staffMemberName: string | null;
  startsAt: string;
  endsAt: string;
  reason: string | null;
};

export type CrmScheduleBlockErrorCode =
  | "STAFF_NOT_FOUND"
  | "INVALID_RANGE"
  | "INVALID_DATE"
  | "BLOCK_NOT_FOUND";

export class CrmScheduleBlockError extends Error {
  constructor(public code: CrmScheduleBlockErrorCode, message: string) {
    super(message);
  }
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function listScheduleBlocks(
  businessId: string,
  options: { fromDate?: Date; limit?: number } = {},
): Promise<CrmScheduleBlockRow[]> {
  const fromDate = options.fromDate ?? startOfTodayUtc();
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);

  const blocks = await db.scheduleBlock.findMany({
    where: {
      businessId,
      endsAt: { gt: fromDate },
    },
    orderBy: { startsAt: "asc" },
    take: limit,
    select: {
      id: true,
      staffMemberId: true,
      startsAt: true,
      endsAt: true,
      reason: true,
      staffMember: { select: { fullName: true } },
    },
  });

  return blocks.map((block) => ({
    id: block.id,
    staffMemberId: block.staffMemberId,
    staffMemberName: block.staffMember?.fullName ?? null,
    startsAt: block.startsAt,
    endsAt: block.endsAt,
    reason: block.reason,
  }));
}

export async function createScheduleBlock(
  businessId: string,
  businessTimezone: string | null | undefined,
  input: CrmScheduleBlockInput,
): Promise<CrmScheduleBlockRow> {
  const tz = getSafeTimeZone(businessTimezone);

  if (!DATE_KEY_PATTERN.test(input.startDateKey) || !DATE_KEY_PATTERN.test(input.endDateKey)) {
    throw new CrmScheduleBlockError("INVALID_DATE", "Data inválida.");
  }
  if (input.endDateKey < input.startDateKey) {
    throw new CrmScheduleBlockError("INVALID_RANGE", "A data de fim não pode ser anterior à de início.");
  }

  let startsAt: Date | null = null;
  let endsAt: Date | null = null;

  if (input.kind === "all_day") {
    const startBounds = getZonedDayBounds(input.startDateKey, tz);
    const endBounds = getZonedDayBounds(input.endDateKey, tz);
    if (!startBounds || !endBounds) {
      throw new CrmScheduleBlockError("INVALID_DATE", "Data inválida.");
    }
    startsAt = startBounds.start;
    endsAt = endBounds.endExclusive;
  } else {
    if (input.startDateKey !== input.endDateKey) {
      throw new CrmScheduleBlockError(
        "INVALID_RANGE",
        "Bloqueio com intervalo de horas tem de ser num único dia.",
      );
    }
    const startTime = input.startTime ?? "";
    const endTime = input.endTime ?? "";
    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
      throw new CrmScheduleBlockError("INVALID_RANGE", "Hora inválida. Usa formato HH:mm.");
    }
    startsAt = zonedTimeToUtc(input.startDateKey, `${startTime}:00`, tz);
    endsAt = zonedTimeToUtc(input.endDateKey, `${endTime}:00`, tz);
  }

  if (!startsAt || !endsAt) {
    throw new CrmScheduleBlockError("INVALID_DATE", "Data inválida.");
  }
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new CrmScheduleBlockError("INVALID_RANGE", "O fim do bloqueio tem de ser depois do início.");
  }

  if (input.staffMemberId) {
    const staff = await db.staffMember.findFirst({
      where: { id: input.staffMemberId, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!staff) {
      throw new CrmScheduleBlockError("STAFF_NOT_FOUND", "Profissional não encontrado.");
    }
  }

  const reason = input.reason?.trim() || null;

  const created = await db.scheduleBlock.create({
    data: {
      businessId,
      staffMemberId: input.staffMemberId ?? null,
      startsAt,
      endsAt,
      reason,
    },
    select: {
      id: true,
      staffMemberId: true,
      startsAt: true,
      endsAt: true,
      reason: true,
      staffMember: { select: { fullName: true } },
    },
  });

  return {
    id: created.id,
    staffMemberId: created.staffMemberId,
    staffMemberName: created.staffMember?.fullName ?? null,
    startsAt: created.startsAt,
    endsAt: created.endsAt,
    reason: created.reason,
  };
}

export async function deleteScheduleBlock(
  businessId: string,
  blockId: string,
): Promise<void> {
  const result = await db.scheduleBlock.deleteMany({
    where: { id: blockId, businessId },
  });
  if (result.count === 0) {
    throw new CrmScheduleBlockError("BLOCK_NOT_FOUND", "Bloqueio não encontrado.");
  }
}

export function toCrmScheduleBlockRowDto(row: CrmScheduleBlockRow): CrmScheduleBlockRowDto {
  return {
    id: row.id,
    staffMemberId: row.staffMemberId,
    staffMemberName: row.staffMemberName,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    reason: row.reason,
  };
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
