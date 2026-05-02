"use client";

import { DraftPreviewFrame } from "@/components/page-editor/draft-preview-frame";
import type { EditorDraft } from "@/lib/page-editor/draft";

type Props = { draft: EditorDraft };

export function IphonePreview({ draft }: Props) {
  return (
    <div className="sticky top-6">
      <div className="relative mx-auto w-[360px]">
        <span
          aria-hidden
          className="absolute -left-[3px] top-[110px] z-20 h-8 w-[3px] rounded-l-sm bg-zinc-700"
        />
        <span
          aria-hidden
          className="absolute -left-[3px] top-[160px] z-20 h-12 w-[3px] rounded-l-sm bg-zinc-700"
        />
        <span
          aria-hidden
          className="absolute -left-[3px] top-[220px] z-20 h-12 w-[3px] rounded-l-sm bg-zinc-700"
        />
        <span
          aria-hidden
          className="absolute -right-[3px] top-[170px] z-20 h-20 w-[3px] rounded-r-sm bg-zinc-700"
        />

        <div className="relative aspect-[9/19.5] rounded-[55px] bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 p-[3px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]">
          <div className="relative h-full w-full overflow-hidden rounded-[52px] bg-black p-[8px]">
            <div className="relative h-full w-full overflow-hidden rounded-[44px] bg-background">
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-2 z-30 h-[28px] w-[110px] -translate-x-1/2 rounded-full bg-black"
              />
              <DraftPreviewFrame
                draft={draft}
                title="Pré-visualização da página"
                className="h-full w-full border-0 bg-background"
              />
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Pré-visualização em tempo real
        </p>
      </div>
    </div>
  );
}
