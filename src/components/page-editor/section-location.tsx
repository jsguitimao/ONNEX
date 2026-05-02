"use client";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/page-editor/field";
import { SectionShell } from "@/components/page-editor/section-shell";
import type { EditorDraft } from "@/lib/page-editor/draft";

type Props = {
  draft: Pick<EditorDraft, "mapsAddress">;
  onChange: (patch: Partial<EditorDraft>) => void;
};

export function SectionLocation({ draft, onChange }: Props) {
  return (
    <SectionShell
      step={9}
      title="Localização"
      description="Morada usada no Google Maps embutido."
    >
      <Field label="Morada completa" hint="Inclui rua, número, código postal, cidade.">
        <Input
          value={draft.mapsAddress}
          onChange={(e) => onChange({ mapsAddress: e.target.value })}
          placeholder="Rua da Misericórdia 50, 1200-273 Lisboa"
        />
      </Field>
    </SectionShell>
  );
}
