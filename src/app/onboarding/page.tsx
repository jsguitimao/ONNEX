import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthUserButton } from "@/components/auth-user-button";
import { OnboardingStudio } from "@/components/onboarding-studio";
import { getBusinessForOnboarding } from "@/lib/business";

export const dynamic = "force-dynamic";

export default async function OnboardingPreviewPage() {
  let initialData;
  try {
    initialData = await getBusinessForOnboarding();
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      redirect("/sign-in?redirect_url=/onboarding");
    }
    throw error;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-6 py-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Setup do negócio
            </span>
            <h1 className="text-4xl font-semibold tracking-tight">
              Primeiro contacto com o produto
            </h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              O objetivo desta etapa é chegar rápido a uma página pública credível, com identidade,
              serviços e estrutura suficiente para começar a receber marcações.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-ring hover:bg-accent"
            >
              Ver dashboard base
              <ArrowRight className="size-4" />
            </Link>
            <AuthUserButton />
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
            <CheckCircle2 className="size-4 text-foreground" />
            Slug público e branding
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
            <CheckCircle2 className="size-4 text-foreground" />
            Equipa e serviços modelados
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
            <CheckCircle2 className="size-4 text-foreground" />
            Preview vivo da página pública
          </span>
        </div>

        <OnboardingStudio initialData={initialData} />
      </div>
    </main>
  );
}
