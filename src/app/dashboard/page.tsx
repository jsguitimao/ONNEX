import { auth } from "@clerk/nextjs/server";
import { PageEditor } from "@/components/page-editor/page-editor";
import { loadEditorDraft } from "@/lib/page-editor/load";
import { buildInitialDraftFromMock } from "@/lib/page-editor/mock-draft";

export const metadata = {
  title: "Editor da página",
  robots: { index: false, follow: false },
};

export default async function PageEditorRoute() {
  const { isAuthenticated } = await auth();

  if (!isAuthenticated) {
    // Modo demo: scaffold com mockBusiness, sem persistência.
    return <PageEditor initialDraft={buildInitialDraftFromMock()} readOnly />;
  }

  const draft = await loadEditorDraft();
  return <PageEditor initialDraft={draft} />;
}
