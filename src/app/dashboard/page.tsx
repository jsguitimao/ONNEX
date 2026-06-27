import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PageEditor } from "@/components/page-editor/page-editor";
import { getCurrentBusiness } from "@/lib/business-modules/core";
import { loadEditorDraft } from "@/lib/page-editor/load";
import { hasActiveAccess } from "@/lib/subscription-access";

export const metadata = {
  title: "Editor da pagina",
  robots: { index: false, follow: false },
};

export default async function PageEditorRoute() {
  const { isAuthenticated } = await auth();

  if (!isAuthenticated) {
    redirect("/sign-in?redirect_url=/dashboard");
  }

  const business = await getCurrentBusiness();
  if (!hasActiveAccess(business.subscription)) {
    redirect("/billing");
  }

  const draft = await loadEditorDraft();
  return <PageEditor initialDraft={draft} />;
}
