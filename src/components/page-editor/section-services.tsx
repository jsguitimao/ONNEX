"use client";

import { useState } from "react";
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
  // Enquanto o utilizador escreve, guardamos o texto CRU do campo e mostramo-lo
  // tal e qual — sem reformatar a cada tecla. Sem isto, escrever "16" no preço
  // reformatava "1" para "1.00" e o "6" caía nas casas decimais → "1.01". Ao
  // sair do campo (blur) largamos o rascunho e voltamos a mostrar o valor
  // normalizado do draft. undefined = mostrar o valor do draft.
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({});
  const [durationDraft, setDurationDraft] = useState<Record<string, string>>({});

  function dropDraft(setter: typeof setPriceDraft, id: string) {
    setter((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function priceDisplay(service: EditorService): string {
    return priceDraft[service.id] ?? (service.priceCents ? (service.priceCents / 100).toFixed(2) : "");
  }

  function durationDisplay(service: EditorService): string {
    return durationDraft[service.id] ?? (service.durationMinutes ? String(service.durationMinutes) : "");
  }

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
    dropDraft(setPriceDraft, id);
    dropDraft(setDurationDraft, id);
  }

  return (
    <SectionShell
      step={6}
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
                  value={durationDisplay(service)}
                  onChange={(e) => {
                    setDurationDraft((prev) => ({ ...prev, [service.id]: e.target.value }));
                    patchService(service.id, {
                      durationMinutes: clampInt(e.target.value, 5, 240),
                    });
                  }}
                  onBlur={() => dropDraft(setDurationDraft, service.id)}
                />
              </Field>
              <Field label="Preço (€)">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={priceDisplay(service)}
                  placeholder="0,00"
                  onChange={(e) => {
                    setPriceDraft((prev) => ({ ...prev, [service.id]: e.target.value }));
                    patchService(service.id, {
                      priceCents: euroStringToCents(e.target.value),
                    });
                  }}
                  onBlur={() => dropDraft(setPriceDraft, service.id)}
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
