import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar, Layers, Smartphone } from "lucide-react";

export const metadata: Metadata = {
  title: "ONNEX.PT — Marca a tua barbearia online",
  description:
    "Plataforma de marcações online para barbearias: página pública, agenda, equipa e clientes num só editor.",
};

const features = [
  {
    icon: Smartphone,
    title: "Página pública pronta",
    body: "Link-in-bio com hero, equipa, serviços, galeria e mapa. Edita e vês em tempo real num mockup iPhone.",
  },
  {
    icon: Calendar,
    title: "Reservas online 24/7",
    body: "Os teus clientes marcam direto no telemóvel. Confirmação imediata e sem comissão por reserva.",
  },
  {
    icon: Layers,
    title: "Tudo num só sítio",
    body: "Página, agenda, equipa, serviços e clientes geridos a partir do mesmo editor — sem mil tabs.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pt-20 pb-12 text-center sm:pt-28">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          ONNEX.PT
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          A tua barbearia, com marcação online em minutos.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Cria a tua página pública, partilha o link e começa a receber reservas
          hoje. Sem instalação, sem comissões.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Abrir editor
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex h-10 items-center rounded-lg border border-border bg-background px-5 text-sm font-medium transition hover:bg-muted"
          >
            Entrar
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-20 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            <p className="text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <p className="font-medium text-foreground">ONNEX.PT</p>
          <nav className="flex flex-wrap gap-4">
            <Link href="/termos" className="transition hover:text-foreground">
              Termos
            </Link>
            <Link href="/privacidade" className="transition hover:text-foreground">
              Privacidade
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
