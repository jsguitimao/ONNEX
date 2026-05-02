"use client";

import { Moon, Sun } from "lucide-react";
import { SectionShell } from "@/components/page-editor/section-shell";
import { cn } from "@/lib/utils";
import type { EditorTheme } from "@/lib/page-editor/draft";

type Props = {
  theme: EditorTheme;
  onChange: (theme: EditorTheme) => void;
};

const OPTIONS: Array<{
  value: EditorTheme;
  label: string;
  caption: string;
  icon: typeof Moon;
}> = [
  { value: "dark", label: "Escuro", caption: "Fundo preto", icon: Moon },
  { value: "light", label: "Claro", caption: "Fundo branco", icon: Sun },
];

export function SectionAppearance({ theme, onChange }: Props) {
  return (
    <SectionShell
      step={2}
      title="Aparência"
      description="Escolhe entre tema claro ou escuro para a página pública."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={cn(
                "flex min-h-[86px] flex-col items-center justify-center rounded-xl border px-6 py-4 text-center transition",
                active
                  ? "border-zinc-950 bg-zinc-950 text-white shadow-sm dark:border-white dark:bg-white dark:text-zinc-950"
                  : "border-zinc-300 bg-white text-zinc-950 hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:hover:border-zinc-400",
              )}
            >
              <Icon className="size-4" />
              <span className="mt-1 text-sm font-semibold leading-5">
                {option.label}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-xs leading-4",
                  active ? "text-white/80 dark:text-zinc-950/70" : "text-zinc-600 dark:text-zinc-400",
                )}
              >
                {option.caption}
              </span>
            </button>
          );
        })}
      </div>
    </SectionShell>
  );
}
