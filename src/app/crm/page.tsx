import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CrmWorkspace } from "@/components/crm/crm-workspace";
import { getCurrentBusiness } from "@/lib/business-modules/core";
import {
  computeCustomerKpis,
  listCustomers,
  toCrmCustomerRowDto,
} from "@/lib/crm/customers";
import { listActiveStaff } from "@/lib/crm/staff";
import {
  listDailyBookings,
  listPendingBookings,
  listWeeklyBookings,
  toCrmBookingRowDto,
  toCrmPendingBookingDto,
} from "@/lib/crm/bookings";
import { listWeeklyAvailabilityForStaffIds } from "@/lib/crm/availability";
import {
  listScheduleBlocks,
  toCrmScheduleBlockRowDto,
} from "@/lib/crm/schedule-blocks";
import { computeFinancialSummary, type CrmFinancialSummary } from "@/lib/crm/finance";
import { getClientListLockState } from "@/lib/crm/client-list-lock";
import { loadEditorDraft } from "@/lib/page-editor/load";
import { hasActiveAccess } from "@/lib/subscription-access";
import { syncSubscriptionFromStripe } from "@/lib/stripe-sync";
import { getStripePriceId } from "@/lib/stripe";
import { captureException } from "@/lib/observability";
import type { CrmSubscriptionInfo } from "@/components/crm/crm-account-panel";

export const metadata = {
  title: "CRM",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SUBSCRIPTION_STATUS_LABELS: Record<string, { label: string; tone: "ok" | "warn" | "bad" }> = {
  TRIALING: { label: "Período de teste", tone: "ok" },
  ACTIVE: { label: "Ativa", tone: "ok" },
  PAST_DUE: { label: "Pagamento em atraso", tone: "warn" },
  CANCELLED: { label: "Cancelada", tone: "bad" },
};

// Nome comercial do plano a partir do Price da Stripe guardado pelo webhook.
function resolvePlanLabel(providerPriceId: string | null): string {
  if (providerPriceId) {
    if (providerPriceId === getStripePriceId("monthly")) return "Pro Mensal — 25,99 €/mês";
    if (providerPriceId === getStripePriceId("trimestral")) return "Pro Trimestral — 66,99 €/3 meses";
    if (providerPriceId === getStripePriceId("anual")) return "Pro Anual — 249,99 €/ano";
    return "Pro";
  }
  return "Sem plano ativo";
}

function toSubscriptionInfo(
  subscription: {
    status: string;
    providerPriceId: string | null;
    providerCustomerId: string | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  } | null,
): CrmSubscriptionInfo {
  const status = SUBSCRIPTION_STATUS_LABELS[subscription?.status ?? ""] ?? {
    label: "Sem subscrição",
    tone: "bad" as const,
  };
  return {
    statusLabel: status.label,
    statusTone: status.tone,
    planLabel: resolvePlanLabel(subscription?.providerPriceId ?? null),
    periodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    hasStripeCustomer: Boolean(subscription?.providerCustomerId),
  };
}

export default async function CrmPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/crm");
  }

  let business;
  try {
    business = await getCurrentBusiness();
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      redirect("/sign-in?redirect_url=/crm");
    }
    captureException("crm.page.load_business_failed", error, { userId });
    throw error;
  }

  // Paywall: sem subscrição ativa (trial expirado / não assinado) → bloqueia o CRM.
  let subscription = business.subscription;
  if (!hasActiveAccess(subscription) && subscription?.providerCustomerId) {
    // Rede de segurança: acabado de pagar mas o webhook ainda não chegou?
    // Consulta a Stripe ao vivo antes de bloquear. Checkout abandonado (cliente
    // sem subscrição) devolve null e continua bloqueado.
    try {
      subscription =
        (await syncSubscriptionFromStripe(business.id, subscription.providerCustomerId)) ??
        subscription;
    } catch (error) {
      captureException("crm.page.stripe_access_recheck_failed", error, { userId });
    }
  }
  if (!hasActiveAccess(subscription)) {
    redirect("/billing");
  }

  const [
    customers,
    customerKpis,
    staff,
    pendingBookings,
    weeklyBookings,
    dailyBookings,
    scheduleBlocks,
    editorDraft,
    clientListLockState,
  ] = await Promise.all([
    listCustomers(business.id),
    computeCustomerKpis(business.id),
    listActiveStaff(business.id),
    listPendingBookings(business.id),
    listWeeklyBookings(business.id, { timezone: business.timezone }),
    listDailyBookings(business.id, { timezone: business.timezone }),
    listScheduleBlocks(business.id),
    loadEditorDraft(),
    getClientListLockState(business.id),
  ]);

  // O Financeiro já não tem "Todos": arranca no 1.º profissional. O valor inicial
  // é o dele — MAS se estiver protegido, mandamos zeros (o painel mostra o cadeado
  // e só busca os valores reais depois do código, via getFinancialSummaryAction).
  const financeFirstStaffId = staff[0]?.id ?? null;
  const financeFirstLocked =
    clientListLockState.enabled &&
    clientListLockState.firstStaffId != null &&
    clientListLockState.firstStaffId === financeFirstStaffId;
  const financialSummary: CrmFinancialSummary = financeFirstLocked
    ? { totalCents: 0, count: 0, period: "semanal", rangeStart: "", rangeEnd: "", customMonth: null }
    : await computeFinancialSummary(business.id, {
        period: "semanal",
        staffMemberId: financeFirstStaffId,
        timezone: business.timezone,
      });

  // Cadeado da lista de clientes: quando o primeiro profissional tem código
  // definido, as marcações dele NÃO viajam para o browser. Só são enviadas depois
  // de o código ser confirmado (unlockClientListAction). Assim o cadeado é real —
  // os dados nem sequer estão no HTML da página.
  const lockedStaffId = clientListLockState.enabled ? clientListLockState.firstStaffId : null;
  // Na secção Clientes escondemos apenas os clientes EXCLUSIVOS do 1.º barbeiro
  // (que só marcaram com ele). Os partilhados continuam visíveis nos outros.
  const visibleCustomers = lockedStaffId
    ? customers.filter(
        (customer) =>
          customer.staffMemberIds.length === 0 ||
          !customer.staffMemberIds.every((id) => id === lockedStaffId),
      )
    : customers;
  const visiblePendingBookings = lockedStaffId
    ? pendingBookings.filter((booking) => booking.staffMemberId !== lockedStaffId)
    : pendingBookings;
  const visibleWeeklyBookings = lockedStaffId
    ? weeklyBookings.filter((booking) => booking.staffMemberId !== lockedStaffId)
    : weeklyBookings;
  const visibleDailyBookings = lockedStaffId
    ? dailyBookings.filter((booking) => booking.staffMemberId !== lockedStaffId)
    : dailyBookings;

  const availabilityByStaff = await listWeeklyAvailabilityForStaffIds(
    business.id,
    staff.map((member) => member.id),
  );

  const services = business.services.map((service) => ({
    id: service.id,
    name: service.name,
    durationMinutes: service.durationMinutes,
    priceCents: service.priceCents,
  }));

  return (
    <CrmWorkspace
      customers={visibleCustomers.map(toCrmCustomerRowDto)}
      customerKpis={customerKpis}
      staff={staff}
      businessAutoAccept={business.autoAcceptBookings}
      pendingBookings={visiblePendingBookings.map(toCrmPendingBookingDto)}
      weeklyBookings={visibleWeeklyBookings.map(toCrmBookingRowDto)}
      dailyBookings={visibleDailyBookings.map(toCrmBookingRowDto)}
      clientListLock={{
        firstStaffId: clientListLockState.firstStaffId,
        enabled: clientListLockState.enabled,
      }}
      businessTimezone={business.timezone}
      availabilityByStaff={availabilityByStaff}
      scheduleBlocks={scheduleBlocks.map(toCrmScheduleBlockRowDto)}
      initialFinancialSummary={financialSummary}
      services={services}
      editorDraft={editorDraft}
      subscription={toSubscriptionInfo(subscription)}
    />
  );
}
