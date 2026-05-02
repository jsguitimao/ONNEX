"use client";

import { useCallback, useMemo, useState } from "react";
import { ExternalLink, Loader2, Save } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { IphonePreview } from "@/components/page-editor/iphone-preview";
import { SectionHero } from "@/components/page-editor/section-hero";
import { SectionIdentity } from "@/components/page-editor/section-identity";
import { SectionSocial } from "@/components/page-editor/section-social";
import { SectionServices } from "@/components/page-editor/section-services";
import { SectionTeam } from "@/components/page-editor/section-team";
import { SectionGallery } from "@/components/page-editor/section-gallery";
import { SectionLocation } from "@/components/page-editor/section-location";
import { SectionAppearance } from "@/components/page-editor/section-appearance";
import { SectionSeo } from "@/components/page-editor/section-seo";
import type { EditorDraft } from "@/lib/page-editor/draft";

type Props = {
  initialDraft: EditorDraft;
  /** Quando true, o botão Guardar não chama API — útil para o scaffold mock. */
  readOnly?: boolean;
};

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success"; at: number }
  | { status: "error"; message: string };

export function PageEditor({ initialDraft, readOnly = false }: Props) {
  const [draft, setDraft] = useState<EditorDraft>(initialDraft);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initialDraft));
  const [save, setSave] = useState<SaveState>({ status: "idle" });

  const patch = useCallback((partial: Partial<EditorDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== savedSnapshot,
    [draft, savedSnapshot],
  );

  async function handleSave() {
    if (readOnly || !isDirty || save.status === "saving") return;
    setSave({ status: "saving" });
    try {
      const response = await fetch("/api/dashboard", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Erro ao guardar");
      }
      // Recarrega o draft do servidor para atualizar IDs novos
      // (uuid cliente → cuid DB) e prevenir duplicação em saves seguintes.
      const refreshed = await fetch("/api/dashboard", { cache: "no-store" });
      if (refreshed.ok) {
        const fresh = (await refreshed.json()) as EditorDraft;
        setDraft(fresh);
        setSavedSnapshot(JSON.stringify(fresh));
      } else {
        setSavedSnapshot(JSON.stringify(draft));
      }
      setSave({ status: "success", at: Date.now() });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao guardar";
      setSave({ status: "error", message });
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-3">
          <div>
            <h1 className="text-sm font-semibold">Página pública</h1>
            <p className="text-xs text-muted-foreground">
              {readOnly
                ? "Modo demo · alterações não são guardadas"
                : "Edita à esquerda · vê em tempo real à direita"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {save.status === "error" ? (
              <p role="alert" className="text-xs text-destructive">
                {save.message}
              </p>
            ) : null}
            {save.status === "success" ? (
              <p className="text-xs text-muted-foreground">Guardado.</p>
            ) : null}
            {!readOnly && draft.slug ? (
              <a
                href={`/${draft.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <ExternalLink className="size-3.5" />
                Ver página
              </a>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={readOnly || !isDirty || save.status === "saving"}
            >
              {save.status === "saving" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-4">
          <SectionHero
            hero={draft.hero}
            onChange={(hero) => patch({ hero })}
            readOnly={readOnly}
          />
          <SectionIdentity
            draft={{
              name: draft.name,
              city: draft.city,
              headline: draft.headline,
              description: draft.description,
            }}
            onChange={patch}
          />
          <SectionSocial
            draft={{
              phone: draft.phone,
              whatsappEnabled: draft.whatsappEnabled,
              instagramUrl: draft.instagramUrl,
              tiktokUrl: draft.tiktokUrl,
              facebookUrl: draft.facebookUrl,
            }}
            onChange={patch}
          />
          <SectionServices
            services={draft.services}
            onChange={(services) => patch({ services })}
          />
          <SectionTeam
            staff={draft.staffMembers}
            onChange={(staffMembers) => patch({ staffMembers })}
            readOnly={readOnly}
          />
          <SectionGallery
            images={draft.galleryImages}
            onChange={(galleryImages) => patch({ galleryImages })}
            readOnly={readOnly}
          />
          <SectionLocation
            draft={{ mapsAddress: draft.mapsAddress }}
            onChange={patch}
          />
          <SectionAppearance
            theme={draft.theme}
            onChange={(theme) => patch({ theme })}
          />
          <SectionSeo
            draft={{ seoTitle: draft.seoTitle, seoDescription: draft.seoDescription }}
            onChange={patch}
          />
        </div>

        <aside>
          <IphonePreview draft={draft} />
        </aside>
      </div>
    </div>
  );
}
