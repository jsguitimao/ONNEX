"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createScheduleBlockAction,
  deleteScheduleBlockAction,
} from "@/app/crm/actions";
import type { CrmScheduleBlockRowDto } from "@/lib/crm/schedule-blocks";
import type { CrmStaffRow } from "@/lib/crm/staff";

type Props = {
  blocks: CrmScheduleBlockRowDto[];
  staff: CrmStaffRow[];
  viewer: CrmStaffRow;
  businessTimezone: string;
  onCreated: (block: CrmScheduleBlockRowDto) => void;
  onDeleted: (blockId: string) => void;
};

type FormState = {
  scope: "viewer" | "business";
  kind: "all_day" | "time_range";
  startDateKey: string;
  endDateKey: string;
  startTime: string;
  endTime: string;
  reason: string;
};

function todayDateKey() {
  const now = new Date();
  return [
    String(now.getFullYear()).padStart(4, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

const initialForm = (): FormState => ({
  scope: "viewer",
  kind: "all_day",
  startDateKey: todayDateKey(),
  endDateKey: todayDateKey(),
  startTime: "09:00",
  endTime: "13:00",
  reason: "",
});

export function TimeOffPanel({
  blocks,
  staff,
  viewer,
  businessTimezone,
  onCreated,
  onDeleted,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [savingDelete, setSavingDelete] = useState<string | null>(null);
  const [isCreating, startCreateTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: businessTimezone,
  });
  const dateTimeFormatter = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: businessTimezone,
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function openForm() {
    setForm(initialForm());
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setError(null);
  }

  function handleCreate() {
    if (isCreating) return;
    setError(null);
    startCreateTransition(async () => {
      const payload = {
        staffMemberId: form.scope === "viewer" ? viewer.id : null,
        kind: form.kind,
        startDateKey: form.startDateKey,
        endDateKey: form.kind === "time_range" ? form.startDateKey : form.endDateKey,
        startTime: form.kind === "time_range" ? form.startTime : null,
        endTime: form.kind === "time_range" ? form.endTime : null,
        reason: form.reason,
      };
      const result = await createScheduleBlockAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onCreated(result.block);
      closeForm();
    });
  }

  function handleDelete(blockId: string) {
    if (savingDelete) return;
    setError(null);
    setSavingDelete(blockId);
    startDeleteTransition(async () => {
      const result = await deleteScheduleBlockAction(blockId);
      setSavingDelete(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDeleted(result.blockId);
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Folgas e bloqueios</h3>
          <p className="text-xs text-muted-foreground">
            Marca dias de folga, férias ou intervalos de horas em que ninguém pode reservar.
          </p>
        </div>
        {!showForm ? (
          <Button type="button" size="sm" onClick={openForm}>
            <Plus className="size-4" />
            Adicionar folga
          </Button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-lg border border-border bg-background p-3">
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Aplicar a">
              <select
                value={form.scope}
                onChange={(event) => update("scope", event.target.value as FormState["scope"])}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="viewer">Apenas {viewer.fullName}</option>
                <option value="business">Toda a equipa ({staff.length})</option>
              </select>
            </FormField>
            <FormField label="Tipo">
              <select
                value={form.kind}
                onChange={(event) => update("kind", event.target.value as FormState["kind"])}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="all_day">Dia(s) inteiros</option>
                <option value="time_range">Intervalo de horas (1 dia)</option>
              </select>
            </FormField>
            <FormField label={form.kind === "all_day" ? "Início" : "Dia"}>
              <Input
                type="date"
                min={todayDateKey()}
                value={form.startDateKey}
                onChange={(event) => update("startDateKey", event.target.value)}
              />
            </FormField>
            {form.kind === "all_day" ? (
              <FormField label="Fim">
                <Input
                  type="date"
                  min={form.startDateKey || todayDateKey()}
                  value={form.endDateKey}
                  onChange={(event) => update("endDateKey", event.target.value)}
                />
              </FormField>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Início">
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(event) => update("startTime", event.target.value)}
                  />
                </FormField>
                <FormField label="Fim">
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(event) => update("endTime", event.target.value)}
                  />
                </FormField>
              </div>
            )}
            <FormField label="Motivo (opcional)" className="md:col-span-2">
              <Input
                value={form.reason}
                onChange={(event) => update("reason", event.target.value)}
                maxLength={200}
                placeholder="Ex.: Férias, formação, doença"
              />
            </FormField>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={closeForm} disabled={isCreating}>
              <X className="size-3.5" />
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Guardar folga
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2">
        {blocks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            Sem folgas marcadas para os próximos dias.
          </p>
        ) : (
          blocks.map((block) => {
            const isAllDay = isAllDayBlock(block, businessTimezone);
            const start = new Date(block.startsAt);
            const end = new Date(block.endsAt);
            const label = isAllDay
              ? formatAllDayRange(start, end, dateFormatter, businessTimezone)
              : `${dateTimeFormatter.format(start)} → ${dateTimeFormatter.format(end)}`;
            const scopeLabel = block.staffMemberName
              ? `Apenas ${block.staffMemberName}`
              : "Toda a equipa";
            const isDeletingThis = savingDelete === block.id && isDeleting;
            return (
              <div
                key={block.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {scopeLabel}
                    {block.reason ? ` · ${block.reason}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{isAllDay ? "Dia(s) inteiros" : "Intervalo"}</Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={Boolean(savingDelete)}
                    onClick={() => handleDelete(block.id)}
                  >
                    {isDeletingThis ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                    Eliminar
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function FormField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`grid gap-1 text-xs font-medium${className ? ` ${className}` : ""}`}>
      {label}
      {children}
    </label>
  );
}

function isAllDayBlock(block: CrmScheduleBlockRowDto, timezone: string) {
  const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const start = new Date(block.startsAt);
  const end = new Date(block.endsAt);
  if (timeFormatter.format(start) !== "00:00") return false;
  if (timeFormatter.format(end) !== "00:00") return false;
  return dayKeyFormatter.format(start) !== dayKeyFormatter.format(end);
}

function formatAllDayRange(
  start: Date,
  end: Date,
  formatter: Intl.DateTimeFormat,
  timezone: string,
) {
  const inclusiveEnd = new Date(end.getTime() - 1);
  const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  if (dayKeyFormatter.format(start) === dayKeyFormatter.format(inclusiveEnd)) {
    return formatter.format(start);
  }
  return `${formatter.format(start)} → ${formatter.format(inclusiveEnd)}`;
}
