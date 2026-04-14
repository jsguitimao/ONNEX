import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Scissors,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const pillars = [
  {
    title: "Página pública da barbearia",
    description:
      "Cada barbearia ganha um endereço público para receber marcações sem depender de mensagens ou chamadas.",
    icon: Store,
  },
  {
    title: "Agenda e operação",
    description:
      "Gestão de serviços, equipa, disponibilidade, clientes e marcações numa experiência única e preparada para crescer.",
    icon: LayoutDashboard,
  },
  {
    title: "Lembretes e pagamentos",
    description:
      "Estrutura pronta para e-mail, SMS e pagamentos online, com arquitetura pensada para Vercel agora e VPS depois.",
    icon: BellRing,
  },
];

const roadmap = [
  "Auth com Clerk e onboarding do negócio",
  "Dashboard com agenda, serviços, equipa e clientes",
  "Perfil público por slug, tipo /nomedabarbearia",
  "Fluxo de marcação com disponibilidade real",
  "Base de notificações e gestão da reserva",
  "Deploy contínuo desde o primeiro ciclo",
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[40rem] bg-[radial-gradient(circle_at_top,_color-mix(in_oklch,_var(--color-primary)_18%,_transparent),_transparent_55%)]" />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Scissors className="size-5" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold tracking-tight">BUKBARBEARIA.COM</p>
              <p className="text-sm text-muted-foreground">software de agendamento para barbearias</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className={buttonVariants({ variant: "ghost" })}>Entrar</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className={buttonVariants({ className: "gap-2" })}>
                  Criar conta
                  <ArrowRight className="size-4" />
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link href="/dashboard" className={buttonVariants({ variant: "ghost" })}>
                Dashboard
              </Link>
              <UserButton />
            </Show>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-16 py-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5">
              Marca nova, arquitetura limpa e foco total na operação da barbearia
            </Badge>
            <h1 className="font-heading text-5xl font-semibold tracking-tight sm:text-6xl">
              BUKBARBEARIA.COM: agendamento, operação e crescimento para a tua barbearia.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Estamos a construir uma plataforma focada em barbearias, com página pública por slug,
              dashboard privado, CRM, agenda operacional, confirmações e lembretes, sem acumular
              atalhos ruins logo no arranque.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <button className={buttonVariants({ size: "lg", className: "gap-2" })}>
                    Começar agora
                    <ArrowRight className="size-4" />
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Link href="/onboarding" className={buttonVariants({ size: "lg", className: "gap-2" })}>
                  Abrir onboarding
                  <ArrowRight className="size-4" />
                </Link>
              </Show>
              <Link href="/barbearia-sample" className={buttonVariants({ size: "lg", variant: "outline" })}>
                Abrir barbearia de exemplo
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-2">
                <CalendarDays className="size-4" />
                Next.js App Router
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-2">
                <Users className="size-4" />
                Clerk + Prisma
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-2">
                <CreditCard className="size-4" />
                Pagamentos para fase final
              </span>
            </div>
          </div>

          <Card className="border-border/60 bg-card/80 shadow-2xl shadow-black/5 backdrop-blur">
            <CardHeader className="space-y-3">
              <Badge variant="outline" className="w-fit rounded-full">
                Base do produto
              </Badge>
              <CardTitle className="font-heading text-2xl">
                O que já estamos a construir com consistência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {roadmap.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border bg-background/70 p-4">
                  <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                    <Sparkles className="size-4" />
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-16 md:grid-cols-3">
          {pillars.map((pillar) => (
            <Card key={pillar.title} className="border-border/60 bg-card">
              <CardHeader>
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <pillar.icon className="size-5" />
                </div>
                <CardTitle className="font-heading text-xl">{pillar.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">{pillar.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
