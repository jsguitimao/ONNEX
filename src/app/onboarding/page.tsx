import { UserButton } from "@clerk/nextjs";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { OnboardingStudio } from "@/components/onboarding-studio";
import { getBusinessForOnboarding } from "@/lib/business";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function OnboardingPreviewPage() {
  const initialData = await getBusinessForOnboarding();

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-6 py-12">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Badge variant="secondary" className="mb-4">
            Setup do negócio
          </Badge>
          <h1 className="font-heading text-4xl font-semibold tracking-tight">Primeiro contacto com o produto</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            O objetivo desta etapa é chegar rápido a uma página pública credível, com identidade,
            serviços e estrutura suficiente para começar a receber marcações.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className={buttonVariants({ variant: "outline", className: "gap-2" })}>
            Ver dashboard base
            <ArrowRight className="size-4" />
          </Link>
          <UserButton />
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-2">
          <CheckCircle2 className="size-4 text-primary" />
          Slug público e branding
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-2">
          <CheckCircle2 className="size-4 text-primary" />
          Equipa e serviços modelados
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-2">
          <CheckCircle2 className="size-4 text-primary" />
          Preview vivo da página pública
        </span>
      </div>

      <OnboardingStudio initialData={initialData} />
    </main>
  );
}
