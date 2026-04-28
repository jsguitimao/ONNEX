"use client";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/page-editor/field";
import { SectionShell } from "@/components/page-editor/section-shell";
import type { EditorDraft } from "@/lib/page-editor/draft";

type Props = {
  draft: Pick<EditorDraft, "seoTitle" | "seoDescription">;
  onChange: (patch: Partial<EditorDraft>) => void;
};

export function SectionSeo({ draft, onChange }: Props) {
  return (
    <SectionShell
      step={8}
      title="SEO"
      description="Como a tua página aparece no Google e em partilhas."
    >
      <Field
        label="Título SEO"
        hint="Ideal até 60 caracteres."
        counter={`${draft.seoTitle.length}/70`}
      >
        <Input
          value={draft.seoTitle}
          onChange={(e) => onChange({ seoTitle: e.target.value })}
          maxLength={70}
          placeholder="Studio Lapidar — Barbearia em Lisboa"
        />
      </Field>
      <Field
        label="Descrição SEO"
        hint="Frase de venda em 1-2 linhas."
        counter={`${draft.seoDescription.length}/160`}
      >
        <textarea
          value={draft.seoDescription}
          onChange={(e) => onChange({ seoDescription: e.target.value })}
          maxLength={160}
          rows={3}
          className="min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </Field>
    </SectionShell>
  );
}
