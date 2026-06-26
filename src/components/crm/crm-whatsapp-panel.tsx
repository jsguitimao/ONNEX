"use client";

import { useState } from "react";
import { saveWhatsappConfigAction } from "@/app/crm/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WhatsappConfig } from "@/lib/crm/whatsapp";

type ReminderUnit = "minutos" | "horas";

function minutesToValueUnit(minutes: number | null): { value: string; unit: ReminderUnit } {
  if (minutes == null) return { value: "2", unit: "horas" };
  if (minutes % 60 === 0) return { value: String(minutes / 60), unit: "horas" };
  return { value: String(minutes), unit: "minutos" };
}

export function WhatsappPanel({ config }: { config: WhatsappConfig }) {
  const initialReminder = minutesToValueUnit(config.reminderLeadMinutes);
  const [number, setNumber] = useState(config.whatsappNumber ?? "");
  const [reminderValue, setReminderValue] = useState(initialReminder.value);
  const [reminderUnit, setReminderUnit] = useState<ReminderUnit>(initialReminder.unit);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    const parsedValue = Number(reminderValue);
    const reminderLeadMinutes =
      Number.isFinite(parsedValue) && parsedValue > 0
        ? parsedValue * (reminderUnit === "horas" ? 60 : 1)
        : null;
    const result = await saveWhatsappConfigAction({
      whatsappNumber: number,
      reminderLeadMinutes,
    });
    setSaving(false);
    setFeedback(
      result.ok
        ? { ok: true, message: "Guardado." }
        : { ok: false, message: result.error },
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        O Onnex envia <span className="font-medium text-foreground">automaticamente</span> as
        confirmações e os lembretes das marcações aos teus clientes. Só tens de fazer{" "}
        <span className="font-medium text-foreground">duas coisas</span>: ligar o número e
        escolher quando enviar o lembrete. O resto é tratado por nós.
      </p>

      {/* Aviso sobre o número */}
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Atenção ao número:</span> este número
          vai ser usado pelo Onnex para enviar as mensagens automaticamente. Por isso{" "}
          <span className="font-medium text-foreground">
            não pode estar a ser usado ao mesmo tempo no WhatsApp normal do telemóvel
          </span>{" "}
          — um número está <span className="font-medium text-foreground">OU na app OU no
          Onnex</span>. Usa um número dedicado às marcações, ou migra o número do negócio.
        </p>
      </div>

      {/* Número de WhatsApp */}
      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-foreground">Número de WhatsApp</span>
        <Input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          inputMode="tel"
          autoComplete="tel"
          placeholder="+351 912 345 678"
        />
      </label>

      {/* Tempo de lembrete */}
      <div className="grid gap-1.5">
        <span className="text-sm font-medium text-foreground">Lembrete automático</span>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Enviar</span>
          <Input
            value={reminderValue}
            onChange={(e) => setReminderValue(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            className="h-9 w-16 text-center"
          />
          <select
            value={reminderUnit}
            onChange={(e) => setReminderUnit(e.target.value as ReminderUnit)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:border-foreground/40"
          >
            <option value="minutos">minutos</option>
            <option value="horas">horas</option>
          </select>
          <span>antes da marcação.</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "A guardar…" : "Guardar"}
        </Button>
        {feedback ? (
          <span
            className={feedback.ok ? "text-sm text-emerald-600" : "text-sm text-destructive"}
          >
            {feedback.message}
          </span>
        ) : null}
      </div>
    </div>
  );
}
