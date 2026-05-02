"use client";

import { Check, SlidersHorizontal } from "lucide-react";
import { SectionShell } from "@/components/page-editor/section-shell";
import { cn } from "@/lib/utils";

type OperationDraft = {
  onlineBooking: boolean;
  showTeam: boolean;
  showPrices: boolean;
  showDurations: boolean;
};

type Props = {
  draft: OperationDraft;
  onChange: (partial: Partial<OperationDraft>) => void;
};

const ITEMS: Array<{
  key: keyof OperationDraft;
  label: string;
}> = [
  { key: "onlineBooking", label: "Permitir reservas online" },
  { key: "showTeam", label: "Mostrar equipa na página pública" },
  { key: "showPrices", label: "Mostrar preços" },
  { key: "showDurations", label: "Mostrar duração" },
];

export function SectionOperations({ draft, onChange }: Props) {
  return (
    <SectionShell
      step={5}
      title="Preferências operacionais"
      icon={<SlidersHorizontal className="size-5" />}
    >
      <div className="flex flex-col gap-3">
        {ITEMS.map((item) => {
          const checked = draft[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange({ [item.key]: !checked })}
              aria-pressed={checked}
              className="flex h-14 items-center justify-between rounded-full border border-border bg-background px-5 text-left text-sm font-medium transition hover:border-foreground/40"
            >
              <span>{item.label}</span>
              <span
                aria-hidden
                className={cn(
                  "flex size-7 items-center justify-center rounded-lg border transition",
                  checked
                    ? "border-foreground bg-foreground text-background"
                    : "border-muted-foreground/50 text-transparent",
                )}
              >
                <Check className="size-4" />
              </span>
            </button>
          );
        })}
      </div>
    </SectionShell>
  );
}
