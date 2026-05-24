"use client";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/page-editor/field";
import { SectionShell } from "@/components/page-editor/section-shell";
import type { EditorDraft } from "@/lib/page-editor/draft";

type Props = {
  draft: Pick<EditorDraft, "name" | "slug" | "city" | "headline" | "description">;
  onChange: (patch: Partial<EditorDraft>) => void;
};

function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function SectionIdentity({ draft, onChange }: Props) {
  const description = draft.description ?? "";
  const headline = draft.headline ?? "";
  const slug = draft.slug ?? "";

  return (
    <SectionShell
      step={3}
      title="Identidade"
      description="Define o nome público e o endereço da página."
    >
      <Field label="Nome público da barbearia">
        <Input
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          maxLength={60}
        />
      </Field>

      <Field
        label="Endereço público"
        hint="Usa apenas letras, números e hífen. Exemplo: gui-barbershop."
        counter={`${slug.length}/40`}
      >
        <div className="flex overflow-hidden rounded-lg border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <span className="flex shrink-0 items-center border-r border-border px-2.5 text-xs text-muted-foreground">
            onnex.pt/
          </span>
          <Input
            value={slug}
            onChange={(e) => onChange({ slug: normalizeSlug(e.target.value) })}
            maxLength={40}
            className="rounded-none border-0 focus-visible:ring-0"
            aria-label="Endereço público da página"
          />
        </div>
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
          value={headline}
          onChange={(e) => onChange({ headline: e.target.value })}
          maxLength={80}
        />
      </Field>
      <Field
        label="Descrição"
        counter={`${description.length}/280`}
      >
        <textarea
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          maxLength={280}
          rows={3}
          className="min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </Field>
    </SectionShell>
  );
}
