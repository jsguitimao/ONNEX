import type Stripe from "stripe";
import { db } from "./db";
import { requireStripe } from "./stripe";

// Sincronização do estado de uma subscrição Stripe → BD. Usada pelo webhook
// (caminho normal) e, como rede de segurança, pelo paywall do /crm quando o
// dono chega antes de o webhook ter sido processado (ex.: regresso do
// checkout com o evento ainda em trânsito).

// Mapeia o estado da subscrição Stripe para o nosso enum SubscriptionStatus.
function mapStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case "trialing":
      return "TRIALING" as const;
    case "active":
      return "ACTIVE" as const;
    case "past_due":
    case "unpaid":
      return "PAST_DUE" as const;
    default:
      // canceled, incomplete, incomplete_expired, paused
      return "CANCELLED" as const;
  }
}

function toDate(seconds: number | null | undefined): Date | null {
  return typeof seconds === "number" ? new Date(seconds * 1000) : null;
}

export async function syncSubscription(sub: Stripe.Subscription) {
  const businessId =
    typeof sub.metadata?.businessId === "string" ? sub.metadata.businessId : null;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const item = sub.items.data[0];
  const status = mapStatus(sub.status);

  const data = {
    status,
    tier: status === "CANCELLED" || status === "PAST_DUE" ? undefined : ("PRO" as const),
    provider: "stripe",
    providerCustomerId: customerId,
    providerPriceId: item?.price?.id ?? null,
    billingCycle:
      item?.price?.recurring?.interval === "year" ? ("YEARLY" as const) : ("MONTHLY" as const),
    currentPeriodStart: toDate(item?.current_period_start ?? sub.start_date),
    currentPeriodEnd: toDate(item?.current_period_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };

  // Encontra a barbearia por businessId (metadata) ou pelo cliente Stripe.
  if (businessId) {
    await db.subscription.updateMany({ where: { businessId }, data });
    return;
  }
  await db.subscription.updateMany({ where: { providerCustomerId: customerId }, data });
}

// Consulta a Stripe ao vivo pela subscrição mais recente do cliente e
// sincroniza-a na BD. Devolve a linha atualizada, ou null se o cliente não
// tem subscrição nenhuma (ex.: checkout aberto e abandonado sem cartão).
export async function syncSubscriptionFromStripe(businessId: string, customerId: string) {
  const stripe = requireStripe();
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
  });
  const latest = subs.data[0];
  if (!latest) return null;

  await syncSubscription(latest);
  return db.subscription.findUnique({ where: { businessId } });
}
