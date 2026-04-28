"use client";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/page-editor/field";
import { SectionShell } from "@/components/page-editor/section-shell";
import type { EditorDraft } from "@/lib/page-editor/draft";

type Props = {
  draft: Pick<
    EditorDraft,
    "phone" | "whatsappEnabled" | "instagramUrl" | "tiktokUrl" | "facebookUrl"
  >;
  onChange: (patch: Partial<EditorDraft>) => void;
};

export function SectionSocial({ draft, onChange }: Props) {
  return (
    <SectionShell
      step={3}
      title="Redes sociais"
      description="Aparecem como ícones por baixo do nome."
    >
      <Field label="Telefone (com indicativo)" hint="Ex: +351 912 345 678">
        <Input
          value={draft.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          inputMode="tel"
          autoComplete="tel"
        />
      </Field>

      <label className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
        <span className="text-xs">
          <span className="font-medium">WhatsApp ativo</span>
          <span className="ml-1 text-muted-foreground">(usa o telefone acima)</span>
        </span>
        <input
          type="checkbox"
          checked={draft.whatsappEnabled}
          onChange={(e) => onChange({ whatsappEnabled: e.target.checked })}
          className="size-4 accent-foreground"
        />
      </label>

      <Field label="Instagram (URL)">
        <Input
          value={draft.instagramUrl}
          onChange={(e) => onChange({ instagramUrl: e.target.value })}
          inputMode="url"
          placeholder="https://instagram.com/…"
        />
      </Field>
      <Field label="TikTok (URL)">
        <Input
          value={draft.tiktokUrl}
          onChange={(e) => onChange({ tiktokUrl: e.target.value })}
          inputMode="url"
          placeholder="https://tiktok.com/@…"
        />
      </Field>
      <Field label="Facebook (URL)">
        <Input
          value={draft.facebookUrl}
          onChange={(e) => onChange({ facebookUrl: e.target.value })}
          inputMode="url"
          placeholder="https://facebook.com/…"
        />
      </Field>
    </SectionShell>
  );
}
