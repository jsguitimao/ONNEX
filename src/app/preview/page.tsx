"use client";

import { useEffect, useState } from "react";
import { BioRender } from "@/components/page-editor/bio-render";
import { buildInitialDraftFromMock } from "@/lib/page-editor/mock-draft";
import { POSTMESSAGE_TYPE, type EditorDraft, type EditorPostMessage } from "@/lib/page-editor/draft";

export default function PreviewPage() {
  const [draft, setDraft] = useState<EditorDraft>(() => buildInitialDraftFromMock());

  useEffect(() => {
    const seoTitle = draft.seoTitle ?? "";
    const seoDescription = draft.seoDescription ?? "";
    const headline = draft.headline ?? "";
    const summary = draft.description ?? "";
    const title =
      seoTitle.trim() || `${draft.name || "A tua página"} — Marcação online`;
    const description =
      seoDescription.trim() ||
      headline.trim() ||
      summary.trim() ||
      `Marca online com ${draft.name || "este negócio"}.`;

    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
  }, [draft]);

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

function setMeta(key: string, content: string, attr: "name" | "property" = "name") {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.content = content;
}
