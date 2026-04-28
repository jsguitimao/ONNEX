"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/page-editor/field";
import { SectionShell } from "@/components/page-editor/section-shell";
import type { EditorService } from "@/lib/page-editor/draft";

type Props = {
  services: EditorService[];
  onChange: (services: EditorService[]) => void;
};

export function SectionServices({ services, onChange }: Props) {
  function addService() {
    const next: EditorService = {
      id: crypto.randomUUID(),
      name: "",
      description: null,
      durationMinutes: 30,
      priceCents: 0,
    };
    onChange([...services, next]);
  }

  function patchService(id: string, patch: Partial<EditorService>) {
    onChange(services.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeService(id: string) {
    onChange(services.filter((s) => s.id !== id));
  }

  return (
    <SectionShell
      step={4}
      title="Serviços"
      description="Aparecem na lista do mobile pela ordem em que aqui estão."
    >
      <ul className="flex flex-col gap-3">
        {services.map((service, index) => (
          <li
            key={service.id}
            className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                #{index + 1}
              </span>
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                aria-label="Remover serviço"
                onClick={() => removeService(service.id)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>

            <Field label="Nome">
              <Input
                value={service.name}
                onChange={(e) => patchService(service.id, { name: e.target.value })}
                maxLength={50}
                placeholder="Ex: Corte tradicional"
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Duração (min)">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={240}
                  step={5}
                  value={service.durationMinutes || ""}
                  onChange={(e) =>
                    patchService(service.id, {
                      durationMinutes: clampInt(e.target.value, 5, 240),
                    })
                  }
                />
              </Field>
              <Field label="Preço (€)">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  value={service.priceCents ? (service.priceCents / 100).toFixed(2) : ""}
                  onChange={(e) =>
                    patchService(service.id, {
                      priceCents: euroStringToCents(e.target.value),
                    })
                  }
                />
              </Field>
            </div>

            <Field label="Descrição (opcional)">
              <Input
                value={service.description ?? ""}
                onChange={(e) =>
                  patchService(service.id, {
                    description: e.target.value.trim() ? e.target.value : null,
                  })
                }
                maxLength={120}
                placeholder="Ex: Corte clássico com acabamento limpo"
              />
            </Field>
          </li>
        ))}
      </ul>

      <Button type="button" variant="outline" size="sm" onClick={addService}>
        <Plus className="size-3.5" />
        Adicionar serviço
      </Button>
    </SectionShell>
  );
}

function clampInt(raw: string, min: number, max: number): number {
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function euroStringToCents(raw: string): number {
  if (!raw.trim()) return 0;
  const normalized = raw.replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value) || value < 0) return 0;
  return Math.round(value * 100);
}
