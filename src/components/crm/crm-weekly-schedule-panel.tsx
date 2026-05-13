"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveStaffDayAvailabilityAction } from "@/app/crm/actions";
import type { CrmDayAvailability, CrmShift } from "@/lib/crm/availability";

type Props = {
  viewerId: string;
  viewerName: string;
  availability: CrmDayAvailability[];
  onDayUpdated: (staffId: string, day: CrmDayAvailability) => void;
};

const DAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT_SHIFT: CrmShift = { startTime: "09:00", endTime: "18:00" };

export function WeeklySchedulePanel({ viewerId, viewerName, availability, onDayUpdated }: Props) {
  const byDay = new Map<number, CrmShift[]>();
  for (const entry of availability) {
    byDay.set(entry.dayOfWeek, entry.shifts);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Horário semanal de {viewerName}</h3>
          <p className="text-xs text-muted-foreground">
            Define os turnos de cada dia da semana. Aplica-se a todos os dias futuros até alterares novamente.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {DAY_ORDER.map((dayOfWeek) => (
          <DayEditor
            key={`${viewerId}-${dayOfWeek}`}
            staffId={viewerId}
            dayOfWeek={dayOfWeek}
            initialShifts={byDay.get(dayOfWeek) ?? []}
            onSaved={(day) => onDayUpdated(viewerId, day)}
          />
        ))}
      </div>
    </div>
  );
}

function DayEditor({
  staffId,
  dayOfWeek,
  initialShifts,
  onSaved,
}: {
  staffId: string;
  dayOfWeek: number;
  initialShifts: CrmShift[];
  onSaved: (day: CrmDayAvailability) => void;
}) {
  const [shifts, setShifts] = useState<CrmShift[]>(initialShifts);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isOpen = shifts.length > 0;

  useEffect(() => {
    setShifts(initialShifts);
  }, [initialShifts]);

  const isDirty = serialize(shifts) !== serialize(initialShifts);

  function updateShift(index: number, patch: Partial<CrmShift>) {
    setShifts((current) =>
      current.map((shift, i) => (i === index ? { ...shift, ...patch } : shift)),
    );
    setError(null);
  }

  function removeShift(index: number) {
    setShifts((current) => current.filter((_, i) => i !== index));
    setError(null);
  }

  function addShift() {
    if (shifts.length >= 2) return;
    const last = shifts[shifts.length - 1];
    const next: CrmShift = last
      ? { startTime: last.endTime, endTime: addOneHour(last.endTime) }
      : DEFAULT_SHIFT;
    setShifts((current) => [...current, next]);
    setError(null);
  }

  function setOpen(open: boolean) {
    setError(null);
    setWarning(null);
    if (open && shifts.length === 0) {
      setShifts([DEFAULT_SHIFT]);
    } else if (!open) {
      setShifts([]);
    }
  }

  function handleSave() {
    if (isPending) return;
    setError(null);
    setWarning(null);
    startTransition(async () => {
      const result = await saveStaffDayAvailabilityAction(staffId, dayOfWeek, shifts);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(result.day);
      if (result.bookingsOutsideCount > 0) {
        setWarning(
          `Atenção: ${result.bookingsOutsideCount} reserva${result.bookingsOutsideCount === 1 ? "" : "s"} futura${result.bookingsOutsideCount === 1 ? "" : "s"} ficou fora do novo horário. Convém remarcar.`,
        );
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p className="w-20 text-sm font-semibold">{DAY_LABELS[dayOfWeek]}</p>
          <Button
            type="button"
            size="sm"
            variant={isOpen ? "default" : "outline"}
            onClick={() => setOpen(!isOpen)}
            disabled={isPending}
          >
            {isOpen ? "Aberto" : "Fechado"}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {isOpen && shifts.length < 2 ? (
            <Button type="button" size="sm" variant="outline" onClick={addShift} disabled={isPending}>
              <Plus className="size-3.5" />
              Turno
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={handleSave} disabled={!isDirty || isPending}>
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Guardar
          </Button>
        </div>
      </div>

      {isOpen ? (
        <div className="mt-3 grid gap-2">
          {shifts.map((shift, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Turno {index + 1}</span>
              <Input
                type="time"
                value={shift.startTime}
                onChange={(event) => updateShift(index, { startTime: event.target.value })}
                className="h-8 w-28"
                aria-label={`Início do turno ${index + 1}`}
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                type="time"
                value={shift.endTime}
                onChange={(event) => updateShift(index, { endTime: event.target.value })}
                className="h-8 w-28"
                aria-label={`Fim do turno ${index + 1}`}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => removeShift(index)}
                disabled={isPending}
                aria-label={`Remover turno ${index + 1}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive"
        >
          {error}
        </p>
      ) : null}
      {warning ? (
        <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">
          {warning}
        </p>
      ) : null}
    </div>
  );
}

function serialize(shifts: CrmShift[]): string {
  return shifts.map((shift) => `${shift.startTime}-${shift.endTime}`).join("|");
}

function addOneHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const next = (h + 1) % 24;
  return `${String(next).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
