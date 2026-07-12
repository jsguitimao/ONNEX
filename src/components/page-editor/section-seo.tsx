"use client";

import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/page-editor/field";
import { SectionShell } from "@/components/page-editor/section-shell";
import { getAppUrl } from "@/lib/app-config";
import type { EditorDraft } from "@/lib/page-editor/draft";

function getAppHost() {
  try {
    return new URL(getAppUrl()).host;
  } catch {
    return "onnex.pt";
  }
}

type Props = {
  draft: Pick<
    EditorDraft,
    "name" | "slug" | "headline" | "description" | "seoTitle" | "seoDescription"
  >;
  onChange: (patch: Partial<EditorDraft>) => void;
};

export function SectionSeo({ draft, onChange }: Props) {
  const seoTitle = draft.seoTitle ?? "";
  const seoDescription = draft.seoDescription ?? "";
  const headline = draft.headline ?? "";
  const description = draft.description ?? "";
  const previewTitle =
    seoTitle.trim() || `${draft.name || "A tua página"} — Marcação online`;
  const previewDescription =
    seoDescription.trim() ||
    headline.trim() ||
    description.trim() ||
    `Marca online com ${draft.name || "este negócio"}.`;
  const previewUrl = `${getAppHost()}/${draft.slug || "slug"}`;
  // Link real para abrir a página (com protocolo). Só clicável se já houver slug.
  const hasSlug = Boolean(draft.slug?.trim());
  const previewHref = `${getAppUrl()}/${draft.slug?.trim() ?? ""}`;

  return (
    <SectionShell
      step={10}
      title="SEO"
      description="Como a tua página aparece no Google e em partilhas."
    >
      <Field
        label="Título SEO"
        hint="Ideal até 60 caracteres."
        counter={`${seoTitle.length}/70`}
      >
        <Input
          value={seoTitle}
          onChange={(e) => onChange({ seoTitle: e.target.value })}
          maxLength={70}
          placeholder="Studio Lapidar — Barbearia em Lisboa"
        />
      </Field>
      <Field
        label="Descrição SEO"
        hint="Frase de venda em 1-2 linhas."
        counter={`${seoDescription.length}/160`}
      >
        <textarea
          value={seoDescription}
          onChange={(e) => onChange({ seoDescription: e.target.value })}
          maxLength={160}
          rows={3}
          className="min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </Field>

      <div className="rounded-2xl border border-border bg-background p-4">
        <p className="text-xs font-medium text-muted-foreground">
          Pré-visualização Google
        </p>
        <div className="mt-3 min-w-0">
          <p className="truncate text-xs text-emerald-700 dark:text-emerald-400">
            {previewUrl}
          </p>
          <p className="mt-1 line-clamp-2 text-base font-medium leading-5 text-blue-700 dark:text-blue-400">
            {previewTitle}
          </p>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
            {previewDescription}
          </p>
        </div>
        {/* Botão grande e fiável (em vez de tornar o pequeno texto do título um
            link — no telemóvel esse alvo minúsculo era difícil de acertar e o
            separador abria por vezes em segundo plano, parecendo que não abriu). */}
        {hasSlug ? (
          <a
            href={previewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm font-semibold text-foreground transition-transform hover:bg-muted active:scale-[0.98]"
          >
            Abrir a minha página
            <ExternalLink className="size-4" />
          </a>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            Guarda a página primeiro para a poderes abrir.
          </p>
        )}
      </div>
    </SectionShell>
  );
}
