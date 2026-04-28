"use client";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/page-editor/field";
import { SectionShell } from "@/components/page-editor/section-shell";
import type { EditorDraft } from "@/lib/page-editor/draft";

type Props = {
  draft: Pick<EditorDraft, "name" | "city" | "headline" | "description">;
  onChange: (patch: Partial<EditorDraft>) => void;
};

export function SectionIdentity({ draft, onChange }: Props) {
  return (
    <SectionShell
      step={2}
      title="Identidade"
      description="O nome e a cidade aparecem por baixo do hero."
    >
      <Field label="Nome do negócio">
        <Input
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          maxLength={60}
        />
      </Field>
      <Field label="Cidade">
        <Input
          value={draft.city}
          onChange={(e) => onChange({ city: e.target.value })}
          maxLength={40}
        />
      </Field>
      <Field label="Headline (opcional)" hint="Frase curta abaixo do nome.">
        <Input
          value={draft.headline}
          onChange={(e) => onChange({ headline: e.target.value })}
          maxLength={80}
        />
      </Field>
      <Field
        label="Descrição"
        counter={`${draft.description.length}/280`}
      >
        <textarea
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
          maxLength={280}
          rows={3}
          className="min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </Field>
    </SectionShell>
  );
}
