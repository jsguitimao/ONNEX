import Link from "next/link";
import { SearchX } from "lucide-react";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <main className="min-h-screen px-6 py-16">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center rounded-[2rem] border bg-card px-8 py-16 text-center shadow-sm">
          <div className="flex size-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <SearchX className="size-7" />
          </div>
          <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-primary">404</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            A página que procuras não está disponível.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Verifica o endereço da barbearia ou volta ao site principal para continuar a navegar.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className={buttonVariants()}>
              Voltar ao início
            </Link>
            <Link href="/sign-up" className={buttonVariants({ variant: "outline" })}>
              Criar conta
            </Link>
          </div>
        </div>
      </main>

      <PublicSiteFooter />
    </>
  );
}
