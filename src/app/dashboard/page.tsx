import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { CalendarRange, Euro, LayoutDashboard, Sparkles, Users } from "lucide-react";
import { DashboardAgenda } from "@/components/dashboard-agenda";
import { DashboardCustomers } from "@/components/dashboard-customers";
import { DashboardOps } from "@/components/dashboard-ops";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getBookingAgenda,
  getBookingAgendaWeek,
  getCustomersSnapshot,
  getDashboardSnapshot,
  getManagementSnapshot,
} from "@/lib/business";
import { formatEuro } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

const panels = [
  {
    title: "Agenda com visao diaria e lista de marcacoes",
    description:
      "O painel agora cobre agenda, filtros, mudanca de estado, reservas manuais e bloqueios de horario.",
    icon: LayoutDashboard,
  },
  {
    title: "Gestao de servicos, equipa e disponibilidade",
    description:
      "A base ja suporta servicos por negocio, profissionais, localizacoes e disponibilidade semanal reutilizavel na pagina publica.",
    icon: Users,
  },
  {
    title: "Clientes, notas e historico de marcacoes",
    description:
      "A camada de CRM consolida historico, preferencias, observacoes internas e recorrencia por cliente.",
    icon: CalendarRange,
  },
];

export default async function DashboardPreviewPage() {
  const [snapshot, management, agenda, agendaWeek, customers] = await Promise.all([
    getDashboardSnapshot(),
    getManagementSnapshot(),
    getBookingAgenda(),
    getBookingAgendaWeek(),
    getCustomersSnapshot(),
  ]);

  const stats = [
    { label: "Servicos ativos", value: snapshot.servicesCount.toString(), icon: Sparkles },
    { label: "Profissionais", value: snapshot.staffCount.toString(), icon: Users },
    { label: "Receita de referencia", value: formatEuro(snapshot.monthlyRevenueCents), icon: Euro },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="mb-4">
            Painel operacional
          </Badge>
          <h1 className="font-heading text-4xl font-semibold tracking-tight">{snapshot.businessName}</h1>
          <p className="mt-3 text-muted-foreground">
            Esta area ja esta desenhada para o fluxo autenticado do negocio. Agora tambem
            permite gerir servicos, equipa, disponibilidade e regras principais da agenda.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Cidade principal: {snapshot.city} - Pagina publica: /{snapshot.slug}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/onboarding" className={buttonVariants()}>
            Ir para onboarding
          </Link>
          <UserButton />
        </div>
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Reservas recentes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {snapshot.recentBookings.map((booking) => (
            <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
              <div>
                <p className="font-medium">{booking.customerName}</p>
                <p className="text-sm text-muted-foreground">
                  {booking.serviceName} - {booking.staffName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {new Date(booking.startsAt).toLocaleDateString("pt-PT")} -{" "}
                  {new Date(booking.startsAt).toLocaleTimeString("pt-PT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm text-muted-foreground">{booking.status}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <DashboardAgenda initialSnapshot={agenda} initialWeekSnapshot={agendaWeek} />

      <DashboardCustomers initialSnapshot={customers} />

      <section className="mt-6">
        <DashboardOps initialSnapshot={management} />
      </section>
    </main>
  );
}
