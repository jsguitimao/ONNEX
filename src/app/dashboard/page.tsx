import { redirect } from "next/navigation";
import { AuthUserButton } from "@/components/auth-user-button";
import { DashboardAgenda } from "@/components/dashboard-agenda";
import { DashboardCommunications } from "@/components/dashboard-communications";
import { DashboardCustomers } from "@/components/dashboard-customers";
import { DashboardOps } from "@/components/dashboard-ops";
import { DashboardPageEditor } from "@/components/dashboard-page-editor";
import { DashboardTabs } from "@/components/dashboard-tabs";
import {
  getBookingAgendaView,
  getBusinessForOnboarding,
  getCommunicationSnapshot,
  getCustomersSnapshot,
  getDashboardSnapshot,
  getManagementSnapshot,
} from "@/lib/business";
import { formatEuro } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default async function DashboardPreviewPage() {
  let snapshot, management, agendaView, customers, communications, pageDraft;
  try {
    [snapshot, management, agendaView, customers, communications, pageDraft] = await Promise.all([
      getDashboardSnapshot(),
      getManagementSnapshot(),
      getBookingAgendaView(),
      getCustomersSnapshot(),
      getCommunicationSnapshot(),
      getBusinessForOnboarding(),
    ]);
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("auth_required") ||
        msg.includes("unauthenticated") ||
        msg.includes("not authenticated") ||
        msg.includes("sign in")
      ) {
        redirect("/sign-in?redirect_url=/dashboard");
      }
    }
    throw error;
  }

  const stats = [
    {
      label: "Serviços",
      value: snapshot.servicesCount.toString(),
      color: "bg-emerald-500/15 text-emerald-700",
    },
    {
      label: "Profissionais",
      value: snapshot.staffCount.toString(),
      color: "bg-sky-500/15 text-sky-700",
    },
    {
      label: "Receita mensal",
      value: formatEuro(snapshot.monthlyRevenueCents),
      color: "bg-amber-500/15 text-amber-700",
    },
    {
      label: "Reservas (mês)",
      value: snapshot.bookingsCount.toString(),
      color: "bg-violet-500/15 text-violet-700",
    },
  ];

  return (
    <DashboardTabs
      businessName={snapshot.businessName}
      slug={snapshot.slug}
      stats={stats}
      userButton={<AuthUserButton />}
    >
      {{
        agenda: (
          <DashboardAgenda
            initialSnapshot={agendaView.agenda}
            initialWeekSnapshot={agendaView.week}
          />
        ),
        comunicacao: <DashboardCommunications initialSnapshot={communications} />,
        clientes: <DashboardCustomers initialSnapshot={customers} />,
        pagina: <DashboardPageEditor initialDraft={pageDraft} slug={snapshot.slug} />,
        gestao: <DashboardOps initialSnapshot={management} />,
      }}
    </DashboardTabs>
  );
}
