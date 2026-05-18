"use client";

import { useState, useTransition } from "react";
import { BellRing, Loader2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  setAutomationTimingsAction,
  setReminderEnabledAction,
  triggerRemindersCronAction,
} from "@/app/crm/actions";
import type { CrmAutomationConfig } from "@/lib/crm/automation";

type TriggerSummary = {
  cancellations: { scanned: number; cancelled: number; advancementsSent: number };
  reminders: { scanned: number; sent: number; skipped: number; failed: number };
};

type Props = {
  automation: CrmAutomationConfig;
  onAutomationUpdated: (config: CrmAutomationConfig) => void;
};

export function ReminderAutomationPanel({ automation, onAutomationUpdated }: Props) {
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [isSavingReminder, startReminderTransition] = useTransition();
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [triggerSummary, setTriggerSummary] = useState<TriggerSummary | null>(null);
  const [isTriggering, startTriggerTransition] = useTransition();

  const [timingsError, setTimingsError] = useState<string | null>(null);
  const [isSavingTimings, startTimingsTransition] = useTransition();
  // Derived state pattern: ressincroniza inputs locais quando o prop externo
  // (automation) muda — sem chamar setState em useEffect (proibido por
  // react-hooks/set-state-in-effect). Padrao recomendado pelo React:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevReminder, setPrevReminder] = useState(automation.reminderMinutesBefore);
  const [prevTolerance, setPrevTolerance] = useState(automation.confirmationToleranceMinutes);
  const [reminderInput, setReminderInput] = useState(String(automation.reminderMinutesBefore));
  const [toleranceInput, setToleranceInput] = useState(String(automation.confirmationToleranceMinutes));

  if (prevReminder !== automation.reminderMinutesBefore) {
    setPrevReminder(automation.reminderMinutesBefore);
    setReminderInput(String(automation.reminderMinutesBefore));
  }
  if (prevTolerance !== automation.confirmationToleranceMinutes) {
    setPrevTolerance(automation.confirmationToleranceMinutes);
    setToleranceInput(String(automation.confirmationToleranceMinutes));
  }

  function handleTriggerNow() {
    if (isTriggering) return;
    setTriggerError(null);
    setTriggerSummary(null);
    startTriggerTransition(async () => {
      const result = await triggerRemindersCronAction();
      if (!result.ok) {
        setTriggerError(result.error);
        return;
      }
      setTriggerSummary(result.summary);
    });
  }

  function handleToggleReminder() {
    if (isSavingReminder) return;
    const next = !automation.reminderEnabled;
    const previous = automation;
    setReminderError(null);
    onAutomationUpdated({ ...automation, reminderEnabled: next });
    startReminderTransition(async () => {
      const result = await setReminderEnabledAction(next);
      if (!result.ok) {
        onAutomationUpdated(previous);
        setReminderError(result.error);
        return;
      }
      onAutomationUpdated(result.automation);
    });
  }

  function commitTiming(field: "reminderMinutesBefore" | "confirmationToleranceMinutes", raw: string) {
    if (isSavingTimings) return;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setTimingsError("Usa um número inteiro positivo.");
      if (field === "reminderMinutesBefore") setReminderInput(String(automation.reminderMinutesBefore));
      else setToleranceInput(String(automation.confirmationToleranceMinutes));
      return;
    }
    if (parsed === automation[field]) {
      setTimingsError(null);
      return;
    }
    const previous = automation;
    setTimingsError(null);
    onAutomationUpdated({ ...automation, [field]: parsed });
    startTimingsTransition(async () => {
      const result = await setAutomationTimingsAction({ [field]: parsed });
      if (!result.ok) {
        onAutomationUpdated(previous);
        setTimingsError(result.error);
        return;
      }
      onAutomationUpdated(result.automation);
    });
  }

  const flowDescription = `Quando ligado: ${automation.reminderMinutesBefore} min antes envia uma única mensagem com lembrete + pedido de confirmação; se o cliente não confirmar dentro de ${automation.confirmationToleranceMinutes} min, cancela automaticamente e convida o próximo cliente a adiantar.`;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <BellRing className="size-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">Lembretes automáticos</h3>
          <p className="text-xs text-muted-foreground">
            Mensagens de WhatsApp enviadas antes de cada marcação.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Estado dos lembretes</p>
            <p className="mt-1 text-sm font-semibold">
              {automation.reminderEnabled
                ? "Ativo — clientes recebem aviso antes da marcação"
                : "Desligado — não é enviado lembrete"}
            </p>
          </div>
          <Button
            type="button"
            variant={automation.reminderEnabled ? "default" : "outline"}
            disabled={isSavingReminder}
            onClick={handleToggleReminder}
          >
            {isSavingReminder ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BellRing className="size-4" />
            )}
            {automation.reminderEnabled ? "Ativo" : "Desligado"}
          </Button>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{flowDescription}</p>
        {reminderError ? (
          <p
            role="alert"
            className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive"
          >
            {reminderError}
          </p>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border border-border bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Tempos da automação</p>
          {isSavingTimings ? <Loader2 className="size-3 animate-spin text-muted-foreground" /> : null}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-medium">
            Lembrete antes do corte (min)
            <Input
              type="number"
              min={5}
              max={240}
              inputMode="numeric"
              value={reminderInput}
              disabled={!automation.reminderEnabled || isSavingTimings}
              onChange={(event) => setReminderInput(event.target.value)}
              onBlur={(event) => commitTiming("reminderMinutesBefore", event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Tolerância para confirmação (min)
            <Input
              type="number"
              min={1}
              max={120}
              inputMode="numeric"
              value={toleranceInput}
              disabled={!automation.reminderEnabled || isSavingTimings}
              onChange={(event) => setToleranceInput(event.target.value)}
              onBlur={(event) => commitTiming("confirmationToleranceMinutes", event.target.value)}
            />
          </label>
        </div>
        {timingsError ? (
          <p
            role="alert"
            className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive"
          >
            {timingsError}
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs">
        <MessageCircle className="size-4 text-muted-foreground" />
        <span className="font-medium">WhatsApp</span>
        <span className="text-muted-foreground">via Twilio</span>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Teste manual</p>
            <p className="mt-1 text-sm font-semibold">Disparar fluxos agora</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Corre os mesmos passos do cron imediatamente. Útil com uma marcação criada para
              daqui a ~{automation.reminderMinutesBefore} min.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isTriggering}
            onClick={handleTriggerNow}
          >
            {isTriggering ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Disparar agora
          </Button>
        </div>
        {triggerError ? (
          <p
            role="alert"
            className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive"
          >
            {triggerError}
          </p>
        ) : null}
        {triggerSummary ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <SummaryCard
              label={`Lembretes ${automation.reminderMinutesBefore} min`}
              metrics={[
                ["Procurados", triggerSummary.reminders.scanned],
                ["Enviados", triggerSummary.reminders.sent],
                ["Skipped", triggerSummary.reminders.skipped],
                ["Falhas", triggerSummary.reminders.failed],
              ]}
            />
            <SummaryCard
              label="Auto-cancel sem confirmação"
              metrics={[
                ["Procurados", triggerSummary.cancellations.scanned],
                ["Cancelados", triggerSummary.cancellations.cancelled],
                ["Convites adiantam.", triggerSummary.cancellations.advancementsSent],
              ]}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryCard({ label, metrics }: { label: string; metrics: Array<[string, number]> }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <dl className="mt-2 grid gap-1 text-[11px] text-muted-foreground">
        {metrics.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt>{k}</dt>
            <dd className="font-semibold text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
