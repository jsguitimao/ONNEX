import Link from "next/link";
import { CalendarRange, Euro, LayoutDashboard, Sparkles, Users } from "lucide-react";
import { getDashboardSnapshot } from "@/lib/business";
import { formatEuro } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const panels = [
  {
    title: "Agenda com visão diária e lista de marcações",
    description:
      "O próximo passo aqui é a agenda operacional, com filtros por profissional, origem da marcação e confirmação de presença.",
    icon: LayoutDashboard,
  },
  {
    title: "Gestão de serviços, equipa e disponibilidade",
    description:
      "A base já prevê serviços por negócio, profissionais, localizações e disponibilidade semanal reutilizável na página pública.",
    icon: Users,
  },
  {
    title: "Clientes, notas e histórico de marcações",
    description:
      "A camada de CRM vai consolidar histórico, preferências, observações internas e recorrência por cliente.",
    icon: CalendarRange,
  },
];

export default async function DashboardPreviewPage() {
  const snapshot = await getDashboardSnapshot();
  const stats = [
    { label: "Serviços ativos", value: snapshot.servicesCount.toString(), icon: Sparkles },
    { label: "Profissionais", value: snapshot.staffCount.toString(), icon: Users },
    { label: "Receita de referência", value: formatEuro(snapshot.monthlyRevenueCents), icon: Euro },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="mb-4">
            Preview estrutural
          </Badge>
          <h1 className="font-heading text-4xl font-semibold tracking-tight">{snapshot.businessName}</h1>
          <p className="mt-3 text-muted-foreground">
            Esta área já está desenhada para o fluxo autenticado do negócio. A partir daqui vamos
            ligar onboarding, persistência, agenda e automações sem trocar a estrutura do app.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Cidade principal: {snapshot.city} · Página pública: /{snapshot.slug}
          </p>
        </div>

        <Link href="/onboarding" className={buttonVariants()}>
          Ir para onboarding
        </Link>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <stat.icon className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="font-heading text-2xl font-semibold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {panels.map((panel) => (
          <Card key={panel.title}>
            <CardHeader>
              <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <panel.icon className="size-5" />
              </div>
              <CardTitle className="font-heading text-xl">{panel.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground">
              {panel.description}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
