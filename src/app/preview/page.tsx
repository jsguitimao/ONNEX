"use client";

import { useEffect, useState } from "react";
import { BioRender } from "@/components/page-editor/bio-render";
import { buildInitialDraftFromMock } from "@/lib/page-editor/mock-draft";
import { POSTMESSAGE_TYPE, type EditorDraft, type EditorPostMessage } from "@/lib/page-editor/draft";

export default function PreviewPage() {
  const [draft, setDraft] = useState<EditorDraft>(() => buildInitialDraftFromMock());

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // Same-origin only.
      if (event.origin !== window.location.origin) return;
      const data = event.data as EditorPostMessage | null;
      if (!data || data.type !== POSTMESSAGE_TYPE) return;
      setDraft(data.payload);
    }
    window.addEventListener("message", onMessage);

    // Sinaliza ao parent que está pronto a receber drafts.
    window.parent?.postMessage({ type: "bukly:editor-ready" }, window.location.origin);

    return () => window.removeEventListener("message", onMessage);
  }, []);

  return <BioRender draft={draft} />;
}
