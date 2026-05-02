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
  icon: typeof Sun;
}> = [
  { value: "dark", label: "Escuro", caption: "Fundo preto", icon: Moon },
  { value: "light", label: "Claro", caption: "Fundo branco", icon: Sun },
];

export function SectionAppearance({ theme, onChange }: Props) {
  return (
    <SectionShell
      step={8}
      title="Aparência"
      description="Escolhe entre tema claro ou escuro para a página pública."
    >
      <div className="grid grid-cols-2 gap-2">
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
                "flex flex-col items-center justify-center gap-1 rounded-lg border px-3 py-4 text-xs transition",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:border-foreground/40 text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span className="font-semibold">{option.label}</span>
              <span
                className={cn(
                  "text-[10px]",
                  active ? "text-background/70" : "text-muted-foreground",
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
