import { db } from "@/lib/db";

export type CrmShift = {
  startTime: string;
  endTime: string;
};

export type CrmDayAvailability = {
  dayOfWeek: number;
  shifts: CrmShift[];
};

export type CrmAvailabilityErrorCode =
  | "STAFF_NOT_FOUND"
  | "INVALID_DAY"
  | "INVALID_SHIFTS";

export class CrmAvailabilityError extends Error {
  constructor(public code: CrmAvailabilityErrorCode, message: string) {
    super(message);
  }
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function validateShifts(shifts: CrmShift[]): void {
  if (shifts.length > 2) {
    throw new CrmAvailabilityError("INVALID_SHIFTS", "No máximo 2 turnos por dia.");
  }
  for (const shift of shifts) {
    if (!TIME_PATTERN.test(shift.startTime) || !TIME_PATTERN.test(shift.endTime)) {
      throw new CrmAvailabilityError("INVALID_SHIFTS", "Horário inválido. Usa formato HH:mm.");
    }
    if (timeToMinutes(shift.endTime) <= timeToMinutes(shift.startTime)) {
      throw new CrmAvailabilityError("INVALID_SHIFTS", "O fim do turno tem de ser depois do início.");
    }
  }
  if (shifts.length === 2) {
    const [a, b] = shifts;
    const aEnd = timeToMinutes(a.endTime);
    const bStart = timeToMinutes(b.startTime);
    if (bStart < aEnd) {
      throw new CrmAvailabilityError(
        "INVALID_SHIFTS",
        "Os turnos não podem sobrepor-se.",
      );
    }
  }
}

export async function listStaffWeeklyAvailability(
  businessId: string,
  staffId: string,
): Promise<CrmDayAvailability[]> {
  const staff = await db.staffMember.findFirst({
    where: { id: staffId, businessId, deletedAt: null },
    select: { id: true },
  });
  if (!staff) {
    throw new CrmAvailabilityError("STAFF_NOT_FOUND", "Profissional não encontrado.");
  }

  const rows = await db.weeklyAvailability.findMany({
    where: { staffMemberId: staff.id, isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    select: { dayOfWeek: true, startTime: true, endTime: true },
  });

  const byDay = new Map<number, CrmShift[]>();
  for (let dow = 0; dow < 7; dow += 1) {
    byDay.set(dow, []);
  }
  for (const row of rows) {
    byDay.get(row.dayOfWeek)?.push({ startTime: row.startTime, endTime: row.endTime });
  }

  return Array.from(byDay.entries()).map(([dayOfWeek, shifts]) => ({
    dayOfWeek,
    shifts,
  }));
}

export async function setStaffDayAvailability(
  businessId: string,
  staffId: string,
  dayOfWeek: number,
  shifts: CrmShift[],
): Promise<CrmDayAvailability> {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new CrmAvailabilityError("INVALID_DAY", "Dia da semana inválido.");
  }
  validateShifts(shifts);

  const staff = await db.staffMember.findFirst({
    where: { id: staffId, businessId, deletedAt: null },
    select: { id: true },
  });
  if (!staff) {
    throw new CrmAvailabilityError("STAFF_NOT_FOUND", "Profissional não encontrado.");
  }

  await db.$transaction(async (tx) => {
    await tx.weeklyAvailability.deleteMany({
      where: { staffMemberId: staff.id, dayOfWeek },
    });
    if (shifts.length > 0) {
      await tx.weeklyAvailability.createMany({
        data: shifts.map((shift) => ({
          staffMemberId: staff.id,
          dayOfWeek,
          startTime: shift.startTime,
          endTime: shift.endTime,
          isActive: true,
        })),
      });
    }
  });

  return { dayOfWeek, shifts };
}

export async function countFutureBookingsOutsideShifts(
  businessId: string,
  staffId: string,
  dayOfWeek: number,
  shifts: CrmShift[],
): Promise<number> {
  const future = await db.booking.findMany({
    where: {
      businessId,
      staffMemberId: staffId,
      startsAt: { gte: new Date() },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    select: { startsAt: true, endsAt: true },
  });

  if (future.length === 0) return 0;

  const targetUtcDay = ((dayOfWeek % 7) + 7) % 7;
  const shiftsByMinutes = shifts.map((shift) => ({
    start: timeToMinutes(shift.startTime),
    end: timeToMinutes(shift.endTime),
  }));

  let outsideCount = 0;
  for (const booking of future) {
    if (booking.startsAt.getUTCDay() !== targetUtcDay) continue;
    const startMinutes = booking.startsAt.getUTCHours() * 60 + booking.startsAt.getUTCMinutes();
    const endMinutes = booking.endsAt.getUTCHours() * 60 + booking.endsAt.getUTCMinutes();
    const fits = shiftsByMinutes.some(
      (shift) => startMinutes >= shift.start && endMinutes <= shift.end,
    );
    if (!fits) outsideCount += 1;
  }
  return outsideCount;
}
