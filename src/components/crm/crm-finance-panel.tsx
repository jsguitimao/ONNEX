"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFinancialSummaryAction } from "@/app/crm/actions";
import type { CrmFinancePeriod, CrmFinancialSummary } from "@/lib/crm/finance";
import type { CrmStaffRow } from "@/lib/crm/staff";

const PERIOD_OPTIONS: { value: CrmFinancePeriod; label: string }[] = [
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "custom", label: "Custom" },
];

type Props = {
  staff: CrmStaffRow[];
  initialSummary: CrmFinancialSummary;
  clientListLock: { firstStaffId: string | null; enabled: boolean };
};

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function FinancePanel({ staff, initialSummary, clientListLock }: Props) {
  const [period, setPeriod] = useState<CrmFinancePeriod>(initialSummary.period);
  const [customMonth, setCustomMonth] = useState<string>(
    initialSummary.customMonth ?? currentMonthKey(),
  );
  const [professionalLabel, setProfessionalLabel] = useState<string>(staff[0]?.fullName ?? "");
  const [summary, setSummary] = useState(initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Cadeado do 1.º profissional: guardamos o código depois de confirmado para as
  // trocas de período seguintes não voltarem a pedir. Só vale nesta sessão.
  const [financeUnlocked, setFinanceUnlocked] = useState(false);
  const [financePin, setFinancePin] = useState<string | null>(null);

  const professionalOptions = useMemo(() => staff.map((member) => member.fullName), [staff]);

  const staffIdForLabel = (label: string) =>
    staff.find((member) => member.fullName === label)?.id ?? null;

  const isFirstProfLabel = (label: string) =>
    clientListLock.firstStaffId != null && staffIdForLabel(label) === clientListLock.firstStaffId;

  // O alvo está protegido e ainda por desbloquear?
  const isLockedTarget = (label: string) =>
    clientListLock.enabled && isFirstProfLabel(label) && !(financeUnlocked && financePin);

  const financeGateActive = isLockedTarget(professionalLabel);

  function refresh(
    nextPeriod: CrmFinancePeriod,
    nextProfessional: string,
    nextCustomMonth: string,
    pinOverride?: string,
  ) {
    // Alvo protegido por desbloquear → não busca nada (aparece o cadeado).
    if (isLockedTarget(nextProfessional) && !pinOverride) return;
    setError(null);
    const staffMemberId = staffIdForLabel(nextProfessional);
    const pin =
      staffMemberId != null && staffMemberId === clientListLock.firstStaffId
        ? pinOverride ?? financePin
        : null;
    startTransition(async () => {
      const result = await getFinancialSummaryAction(
        nextPeriod,
        staffMemberId,
        nextPeriod === "custom" ? nextCustomMonth : null,
        pin,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSummary(result.summary);
    });
  }

  function handleUnlock(pin: string) {
    setError(null);
    startTransition(async () => {
      const result = await getFinancialSummaryAction(
        period,
        clientListLock.firstStaffId,
        period === "custom" ? customMonth : null,
        pin,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFinanceUnlocked(true);
      setFinancePin(pin);
      setSummary(result.summary);
    });
  }

  function selectPeriod(next: CrmFinancePeriod) {
    if (next === period && !error) return;
    setPeriod(next);
    refresh(next, professionalLabel, customMonth);
  }

  function selectCustomMonth(next: string) {
    setCustomMonth(next);
    if (period !== "custom") setPeriod("custom");
    if (/^\d{4}-\d{2}$/.test(next)) {
      refresh("custom", professionalLabel, next);
    }
  }

  function selectProfessional(next: string) {
    if (next === professionalLabel && !error) return;
    setProfessionalLabel(next);
    refresh(period, next, customMonth);
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Receita concluída</h3>
            <p className="text-xs text-muted-foreground">
              Soma do preço das marcações com estado <strong>Concluído</strong> no período.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={period === item.value ? "default" : "outline"}
                disabled={isPending}
                onClick={() => selectPeriod(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {period === "custom" ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label htmlFor="finance-custom-month" className="text-xs text-muted-foreground">
              Escolhe o mês
            </label>
            <input
              id="finance-custom-month"
              type="month"
              value={customMonth}
              max={currentMonthKey()}
              disabled={isPending}
              onChange={(event) => selectCustomMonth(event.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Profissional</span>
          {professionalOptions.map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={professionalLabel === item ? "default" : "outline"}
              disabled={isPending}
              onClick={() => selectProfessional(item)}
            >
              {clientListLock.enabled && isFirstProfLabel(item) ? (
                <Lock className="size-3.5" />
              ) : null}
              {item}
            </Button>
          ))}
          {isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive"
          >
            {error}
          </p>
        ) : null}

        {financeGateActive ? (
          <FinanceLockGate
            staffName={professionalLabel}
            isPending={isPending}
            onUnlock={handleUnlock}
          />
        ) : (
          <>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground">Receita concluída</p>
                <p className="mt-2 text-3xl font-semibold">{formatCurrency(summary.totalCents)}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground">Serviços concluídos</p>
                <p className="mt-2 text-3xl font-semibold">{summary.count}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground">Período selecionado</p>
                <p className="mt-2 text-2xl font-semibold">{periodLabel(period, customMonth)}</p>
              </div>
            </div>

            <p className="mt-4 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              Inclui apenas marcações com estado <strong>Concluído</strong>. Pendentes, confirmadas,
              canceladas e não comparências não entram. Pagamentos reais não estão integrados — este é o
              valor de serviço dos cortes finalizados.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function FinanceLockGate({
  staffName,
  isPending,
  onUnlock,
}: {
  staffName: string;
  isPending: boolean;
  onUnlock: (pin: string) => void;
}) {
  const [pin, setPin] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || pin.length < 4) return;
    onUnlock(pin);
  }

  return (
    <div className="mt-5 rounded-lg border border-border bg-background p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Lock className="size-5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold">Valores protegidos</h4>
          <p className="text-xs text-muted-foreground">
            A receita de {staffName} está protegida. Introduz o código de segurança para a ver.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-center gap-2" noValidate>
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
          placeholder="Código"
          className="h-9 w-40"
          aria-label="Código de segurança"
        />
        <Button type="submit" size="sm" disabled={isPending || pin.length < 4}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <LockOpen className="size-4" />}
          Desbloquear
        </Button>
      </form>
    </div>
  );
}

function periodLabel(period: CrmFinancePeriod, customMonth: string) {
  if (period === "semanal") return "Semana atual";
  if (period === "mensal") return "Mês atual";
  if (period === "trimestral") return "Trimestre atual";
  return formatMonthLabel(customMonth);
}

function formatMonthLabel(key: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return "Mês";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  const label = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatCurrency(valueCents: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(valueCents / 100);
}
