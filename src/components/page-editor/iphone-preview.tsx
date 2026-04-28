"use client";

import { useEffect, useRef } from "react";
import { POSTMESSAGE_TYPE, type EditorDraft } from "@/lib/page-editor/draft";

type Props = { draft: EditorDraft };

export function IphonePreview({ draft }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isReadyRef = useRef(false);

  // Quando o iframe avisa que está pronto, marca como ready e faz primeiro send.
  useEffect(() => {
    function onReady(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string } | null;
      if (data?.type === "bukly:editor-ready") {
        isReadyRef.current = true;
        send(draft);
      }
    }
    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sempre que o draft muda, propaga ao iframe (debounce ligeiro).
  useEffect(() => {
    if (!isReadyRef.current) return;
    const handle = setTimeout(() => send(draft), 80);
    return () => clearTimeout(handle);
  }, [draft]);

  function send(payload: EditorDraft) {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: POSTMESSAGE_TYPE, payload }, window.location.origin);
  }

  return (
    <div className="sticky top-6">
      <div className="relative mx-auto w-[360px]">
        {/* Botões laterais */}
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

        {/* Frame externo (titanium) */}
        <div className="relative aspect-[9/19.5] rounded-[55px] bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 p-[3px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]">
          {/* Bezel preto */}
          <div className="relative h-full w-full overflow-hidden rounded-[52px] bg-black p-[8px]">
            {/* Ecrã */}
            <div className="relative h-full w-full overflow-hidden rounded-[44px] bg-background">
              {/* Dynamic Island */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-2 z-30 h-[28px] w-[110px] -translate-x-1/2 rounded-full bg-black"
              />
              <iframe
                ref={iframeRef}
                src="/preview"
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
