"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, Save, X } from "lucide-react";
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
import { SectionOperations } from "@/components/page-editor/section-operations";
import { SectionSeo } from "@/components/page-editor/section-seo";
import { DraftPreviewFrame } from "@/components/page-editor/draft-preview-frame";
import type { EditorDraft } from "@/lib/page-editor/draft";

const DEMO_DRAFT_STORAGE_KEY = "bukly:page-editor-demo-draft";

type Props = {
  initialDraft: EditorDraft;
  /** Quando true, o botao Guardar fica local ao navegador. */
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
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!readOnly) return;
    const stored = window.localStorage.getItem(DEMO_DRAFT_STORAGE_KEY);
    if (!stored) return;
    try {
      const restored = JSON.parse(stored) as EditorDraft;
      setDraft(restored);
      setSavedSnapshot(JSON.stringify(restored));
    } catch {
      window.localStorage.removeItem(DEMO_DRAFT_STORAGE_KEY);
    }
  }, [readOnly]);

  const patch = useCallback((partial: Partial<EditorDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== savedSnapshot,
    [draft, savedSnapshot],
  );

  async function handleSave() {
    if (!isDirty || save.status === "saving") return;
    setSave({ status: "saving" });
    try {
      if (readOnly) {
        const draftToStore = stripLocalBlobMedia(draft);
        window.localStorage.setItem(
          DEMO_DRAFT_STORAGE_KEY,
          JSON.stringify(draftToStore),
        );
        setSavedSnapshot(JSON.stringify(draft));
        setSave({ status: "success", at: Date.now() });
        return;
      }

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
                ? "Modo demo · alterações guardadas neste navegador"
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
            <Link href="/crm" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <ArrowLeft className="size-3.5" />
              Gestão comercial
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
            >
              <ExternalLink className="size-3.5" />
              Ver página
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || save.status === "saving"}
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
          <SectionAppearance
            theme={draft.theme}
            onChange={(theme) => patch({ theme })}
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
          <SectionOperations
            draft={{
              onlineBooking: draft.onlineBooking,
              showTeam: draft.showTeam,
              showPrices: draft.showPrices,
              showDurations: draft.showDurations,
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
          <SectionSeo
            draft={{
              name: draft.name,
              slug: draft.slug,
              headline: draft.headline,
              description: draft.description,
              seoTitle: draft.seoTitle,
              seoDescription: draft.seoDescription,
            }}
            onChange={patch}
          />
        </div>

        <aside>
          <IphonePreview draft={draft} />
        </aside>
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-50 bg-background">
          <header className="flex h-14 items-center justify-between border-b border-border px-4">
            <div>
              <p className="text-sm font-semibold">Prévia do consumidor</p>
              <p className="text-xs text-muted-foreground">
                Atualiza em tempo real com as alterações do editor.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(false)}
            >
              <X className="size-3.5" />
              Fechar
            </Button>
          </header>
          <DraftPreviewFrame
            draft={draft}
            title="Prévia do consumidor"
            className="h-[calc(100vh-3.5rem)] w-full border-0 bg-background"
          />
        </div>
      ) : null}
    </div>
  );
}

function stripLocalBlobMedia(draft: EditorDraft): EditorDraft {
  if (!draft.hero?.url.startsWith("blob:")) return draft;
  return { ...draft, hero: null };
}
