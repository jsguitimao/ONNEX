"use client";

import { PublicPageRenderer } from "@/components/public-page-renderer";
import type { EditorDraft } from "@/lib/page-editor/draft";
import { fromEditorDraft } from "@/lib/public-page/from-editor-draft";

type Props = { draft: EditorDraft };

export function BioRender({ draft }: Props) {
  return <PublicPageRenderer viewModel={fromEditorDraft(draft)} bookingMode="preview" />;
}
