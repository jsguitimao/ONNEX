"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFinancialSummaryAction } from "@/app/crm/actions";
import type { CrmFinancePeriod, CrmFinancialSummary } from "@/lib/crm/finance";
import type { CrmStaffRow } from "@/lib/crm/staff";

const ALL_OPTION = "Todos";

type Props = {
  staff: CrmStaffRow[];
  initialSummary: CrmFinancialSummary;
};

export function FinancePanel({ staff, initialSummary }: Props) {
  const [period, setPeriod] = useState<CrmFinancePeriod>(initialSummary.period);
  const [professionalLabel, setProfessionalLabel] = useState<string>(ALL_OPTION);
  const [summary, setSummary] = useState(initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const professionalOptions = useMemo(
    () => [ALL_OPTION, ...staff.map((member) => member.fullName)],
    [staff],
  );

  function refresh(nextPeriod: CrmFinancePeriod, nextProfessional: string) {
    setError(null);
    const staffMember = staff.find((member) => member.fullName === nextProfessional);
    const staffMemberId = nextProfessional === ALL_OPTION ? null : staffMember?.id ?? null;
    startTransition(async () => {
      const result = await getFinancialSummaryAction(nextPeriod, staffMemberId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSummary(result.summary);
    });
  }

  function selectPeriod(next: CrmFinancePeriod) {
    if (next === period && !error) return;
    setPeriod(next);
    refresh(next, professionalLabel);
  }

  function selectProfessional(next: string) {
    if (next === professionalLabel && !error) return;
    setProfessionalLabel(next);
    refresh(period, next);
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
            {(["semanal", "mensal"] as CrmFinancePeriod[]).map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={period === item ? "default" : "outline"}
                disabled={isPending}
                onClick={() => selectPeriod(item)}
              >
                {item === "semanal" ? "Semanal" : "Mensal"}
              </Button>
            ))}
          </div>
        </div>

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
            <p className="mt-2 text-3xl font-semibold">
              {period === "semanal" ? "Semana atual" : "Mês atual"}
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          Inclui apenas marcações com estado <strong>Concluído</strong>. Pendentes, confirmadas, canceladas
          e não comparências não entram. Pagamentos reais não estão integrados — este é o valor de serviço
          dos cortes finalizados.
        </p>
      </div>
    </div>
  );
}

function formatCurrency(valueCents: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(valueCents / 100);
}
