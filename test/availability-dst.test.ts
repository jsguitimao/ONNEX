import { describe, expect, it } from "vitest";

// `@/lib/db` instancia o PrismaClient ao importar. A funcao pura nao toca na
// base de dados, mas mockamos na mesma para nao arrastar o Prisma para o teste.
import { vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));

import { countBookingsOutsideShifts } from "@/lib/crm/availability";
import { zonedTimeToUtc } from "@/lib/timezone";

const TZ = "Europe/Lisbon";

function utc(dateKey: string, time: string) {
  const value = zonedTimeToUtc(dateKey, time, TZ);
  if (!value) throw new Error(`data invalida no teste: ${dateKey} ${time}`);
  return value;
}

describe("countBookingsOutsideShifts (timezone/DST)", () => {
  // Turno de segunda 09:00-13:00 em hora local de Lisboa. O dayOfWeek segue a
  // convencao getUTCDay (domingo=0), por isso segunda = 1.
  const shifts = [{ startTime: "09:00", endTime: "13:00" }];

  it("compara reservas na timezone do negocio no verao (UTC+1)", () => {
    // Verao: Lisboa = UTC+1, logo 09:00 local == 08:00 UTC. A logica antiga
    // baseada em UTC lia 08:00 e marcava (erradamente) como antes do turno.
    const inside = {
      startsAt: utc("2026-07-06", "09:00"),
      endsAt: utc("2026-07-06", "09:30"),
    };
    const outside = {
      startsAt: utc("2026-07-06", "14:00"),
      endsAt: utc("2026-07-06", "14:30"),
    };

    expect(countBookingsOutsideShifts([inside], 1, shifts, TZ)).toBe(0);
    expect(countBookingsOutsideShifts([outside], 1, shifts, TZ)).toBe(1);
    expect(countBookingsOutsideShifts([inside, outside], 1, shifts, TZ)).toBe(1);
  });

  it("nao regride no inverno (UTC+0)", () => {
    const inside = {
      startsAt: utc("2026-01-12", "09:00"),
      endsAt: utc("2026-01-12", "09:30"),
    };
    expect(countBookingsOutsideShifts([inside], 1, shifts, TZ)).toBe(0);
  });

  it("mantem o dia da semana local na fronteira da meia-noite (verao)", () => {
    // 00:30 local de segunda no verao == 23:30 UTC de domingo. A logica antiga
    // (UTC) tratava como domingo e ignorava; a local mantem em segunda.
    const overnightShift = [{ startTime: "00:00", endTime: "08:00" }];
    const lateNight = {
      startsAt: utc("2026-07-06", "00:30"),
      endsAt: utc("2026-07-06", "01:00"),
    };

    // E segunda (1) e dentro do turno -> 0 fora.
    expect(countBookingsOutsideShifts([lateNight], 1, overnightShift, TZ)).toBe(0);
    // NAO e domingo (0) -> e filtrada (tambem 0).
    expect(countBookingsOutsideShifts([lateNight], 0, overnightShift, TZ)).toBe(0);
  });

  it("usa Europe/Lisbon como fallback quando a timezone e invalida/nula", () => {
    const inside = {
      startsAt: utc("2026-07-06", "10:00"),
      endsAt: utc("2026-07-06", "10:30"),
    };
    expect(countBookingsOutsideShifts([inside], 1, shifts, null)).toBe(0);
    expect(countBookingsOutsideShifts([inside], 1, shifts, "Nope/Invalid")).toBe(0);
  });
});
