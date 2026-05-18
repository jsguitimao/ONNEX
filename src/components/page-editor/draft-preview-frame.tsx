"use client";

import { useCallback, useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { POSTMESSAGE_TYPE, type EditorDraft } from "@/lib/page-editor/draft";

type Props = Omit<ComponentPropsWithoutRef<"iframe">, "src"> & {
  draft: EditorDraft;
};

export function DraftPreviewFrame({ draft, ...iframeProps }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const sendDraft = useCallback((payload: EditorDraft) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: POSTMESSAGE_TYPE, payload },
      window.location.origin,
    );
  }, []);

  useEffect(() => {
    function onReady(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string } | null;
      if (data?.type === "onnex:editor-ready") {
        sendDraft(draft);
      }
    }

    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
  }, [draft, sendDraft]);

  useEffect(() => {
    const handle = setTimeout(() => sendDraft(draft), 300);
    return () => clearTimeout(handle);
  }, [draft, sendDraft]);

  return (
    <iframe
      {...iframeProps}
      ref={iframeRef}
      src="/preview"
      onLoad={() => sendDraft(draft)}
    />
  );
}
