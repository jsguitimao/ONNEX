import Link from "next/link";
import { Euro, ExternalLink, Sparkles, Users } from "lucide-react";
import { AuthUserButton } from "@/components/auth-user-button";
import { DashboardAgenda } from "@/components/dashboard-agenda";
import { DashboardCommunications } from "@/components/dashboard-communications";
import { DashboardCustomers } from "@/components/dashboard-customers";
import { DashboardOps } from "@/components/dashboard-ops";
import { DashboardTabs } from "@/components/dashboard-tabs";
import {
  getBookingAgendaView,
  getCommunicationSnapshot,
  getCustomersSnapshot,
  getDashboardSnapshot,
  getManagementSnapshot,
} from "@/lib/business";
import { formatEuro } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default async function DashboardPreviewPage() {
  const [snapshot, management, agendaView, customers, communications] = await Promise.all([
    getDashboardSnapshot(),
    getManagementSnapshot(),
    getBookingAgendaView(),
    getCustomersSnapshot(),
    getCommunicationSnapshot(),
  ]);

  const stats = [
    { label: "Serviços ativos", value: snapshot.servicesCount.toString(), icon: Sparkles },
    { label: "Profissionais", value: snapshot.staffCount.toString(), icon: Users },
    { label: "Receita mensal", value: formatEuro(snapshot.monthlyRevenueCents), icon: Euro },
  ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-heading text-lg font-bold">
            {snapshot.businessName.charAt(0)}
          </div>
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              {snapshot.businessName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {snapshot.city} · /{snapshot.slug}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/${snapshot.slug}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
            Ver página pública
          </Link>
          <AuthUserButton />
        </div>
      </header>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-2xl border border-border/70 bg-background px-5 py-4"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <stat.icon className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="font-heading text-lg font-semibold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <DashboardTabs>
        {{
          agenda: (
            <DashboardAgenda
              initialSnapshot={agendaView.agenda}
              initialWeekSnapshot={agendaView.week}
            />
          ),
          comunicacao: <DashboardCommunications initialSnapshot={communications} />,
          clientes: <DashboardCustomers initialSnapshot={customers} />,
          gestao: <DashboardOps initialSnapshot={management} />,
        }}
      </DashboardTabs>
    </main>
  );
}
