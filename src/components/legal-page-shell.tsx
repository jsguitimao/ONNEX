import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { buttonVariants } from "@/components/ui/button";

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  children: ReactNode;
};

export function LegalPageShell({
  eyebrow,
  title,
  description,
  updatedAt,
  children,
}: LegalPageShellProps) {
  return (
    <>
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_color-mix(in_oklch,_var(--color-primary)_12%,_transparent),_transparent_55%)] px-6 py-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <Link href="/" className={buttonVariants({ variant: "ghost", className: "w-fit gap-2" })}>
            <ArrowLeft className="size-4" />
            Voltar ao site
          </Link>

          <section className="rounded-[2rem] border bg-card p-8 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
            <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">{description}</p>
            <p className="mt-4 text-sm text-muted-foreground">Ultima atualizacao: {updatedAt}</p>
          </section>

          <section className="rounded-[2rem] border bg-card p-8 shadow-sm">
            <div className="grid gap-8 text-sm leading-7 text-muted-foreground [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_p_strong]:text-foreground [&_ul]:grid [&_ul]:gap-2 [&_li]:ml-5 [&_li]:list-disc">
              {children}
            </div>
          </section>
        </div>
      </main>

      <PublicSiteFooter />
    </>
  );
}
