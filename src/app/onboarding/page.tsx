import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { AuthUserButton } from "@/components/auth-user-button";
import { OnboardingStudio } from "@/components/onboarding-studio";
import { getBusinessForOnboarding } from "@/lib/business";

export const dynamic = "force-dynamic";

export default async function OnboardingPreviewPage() {
  const initialData = await getBusinessForOnboarding();

  return (
    <main className="min-h-screen bg-[#0b1020] text-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-300">
              Setup do negócio
            </span>
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-white">
              Primeiro contacto com o produto
            </h1>
            <p className="mt-3 max-w-3xl text-neutral-300">
              O objetivo desta etapa é chegar rápido a uma página pública credível, com identidade,
              serviços e estrutura suficiente para começar a receber marcações.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-amber-300/40 hover:bg-white/10"
            >
              Ver dashboard base
              <ArrowRight className="size-4" />
            </Link>
            <AuthUserButton />
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-3 text-sm text-neutral-300">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
            <CheckCircle2 className="size-4 text-amber-300" />
            Slug público e branding
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
            <CheckCircle2 className="size-4 text-amber-300" />
            Equipa e serviços modelados
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
            <CheckCircle2 className="size-4 text-amber-300" />
            Preview vivo da página pública
          </span>
        </div>

        <OnboardingStudio initialData={initialData} />
      </div>
    </main>
  );
}
