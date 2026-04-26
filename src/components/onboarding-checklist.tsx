"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  done: boolean;
};

type Props = {
  items: ChecklistItem[];
};

export function OnboardingChecklist({ items }: Props) {
  const total = items.length;
  const doneCount = items.filter((item) => item.done).length;
  const allDone = doneCount === total;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const [expanded, setExpanded] = useState(!allDone);

  if (allDone) {
    // Quando tudo está feito, esconde discretamente — não polui o dashboard.
    return null;
  }

  return (
    <section
      aria-label="Checklist de configuração"
      className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Configuração do negócio · {doneCount} de {total} concluídas
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-500/20">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${progress}%` }}
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="rounded-lg border border-amber-500/40 bg-background px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-500/10 dark:text-amber-200"
          aria-expanded={expanded}
          aria-controls="onboarding-checklist-items"
        >
          {expanded ? (
            <span className="flex items-center gap-1">
              Esconder <ChevronUp className="size-3" />
            </span>
          ) : (
            <span className="flex items-center gap-1">
              Ver passos <ChevronDown className="size-3" />
            </span>
          )}
        </button>
      </header>

      {expanded ? (
        <ul id="onboarding-checklist-items" className="mt-4 grid gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border bg-background/60 px-3 py-2.5 text-sm",
                item.done
                  ? "border-emerald-500/30 text-muted-foreground line-through"
                  : "border-border",
              )}
            >
              {item.done ? (
                <Check className="mt-0.5 size-4 text-emerald-600" aria-hidden />
              ) : (
                <Circle className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
              )}
              <div className="flex-1">
                <p className="font-medium">{item.label}</p>
                {!item.done ? (
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
