"use client";

import { useMemo } from "react";
import { BookingSheetProvider } from "@/components/booking-sheet";
import { PublicPageRenderer } from "@/components/public-page-renderer";
import type { PublicBusinessPayload } from "@/lib/business";
import { mockBusiness } from "@/lib/mock-business";
import type { EditorDraft } from "@/lib/page-editor/draft";
import { fromEditorDraft } from "@/lib/public-page/from-editor-draft";

type Props = { draft: EditorDraft };

export function BioRender({ draft }: Props) {
  const previewBusiness = useMemo(() => fromEditorDraftToPreviewBusiness(draft), [draft]);

  return (
    <BookingSheetProvider business={previewBusiness} mockMode>
      <PublicPageRenderer viewModel={fromEditorDraft(draft)} />
    </BookingSheetProvider>
  );
}

function fromEditorDraftToPreviewBusiness(draft: EditorDraft): PublicBusinessPayload {
  const heroUrl = draft.hero?.kind === "image" ? draft.hero.url : mockBusiness.heroImageUrl;

  return {
    ...mockBusiness,
    id: "preview-business",
    name: draft.name,
    slug: draft.slug || mockBusiness.slug,
    mapsAddress: draft.mapsAddress || null,
    phone: draft.phone || null,
    instagramUrl: draft.instagramUrl || null,
    tiktokUrl: draft.tiktokUrl || null,
    facebookUrl: draft.facebookUrl || null,
    description: draft.description || null,
    headline: draft.headline || null,
    heroImageUrl: heroUrl,
    coverImageUrl: heroUrl,
    theme: draft.theme,
    onlineBooking: draft.onlineBooking,
    showTeam: draft.showTeam,
    showPrices: draft.showPrices,
    showDurations: draft.showDurations,
    services: draft.services,
    staffMembers: draft.staffMembers,
  };
}
