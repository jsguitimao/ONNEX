import { db } from "./db";
import { getStripePriceId, requireStripe, type PlanId } from "./stripe";

const TRIAL_DAYS = 7;

// Cria (ou reutiliza) o cliente Stripe da barbearia e abre uma Checkout Session
// de subscrição com 7 dias de trial. O cartão é recolhido pela Stripe (página
// alojada — não guardamos cartões). O webhook depois sincroniza o estado real.
export async function createProCheckoutSession(input: {
  businessId: string;
  ownerEmail: string;
  origin: string;
  plan?: PlanId;
}): Promise<{ url: string }> {
  const stripe = requireStripe();
  const priceId = getStripePriceId(input.plan ?? "monthly");
  if (!priceId) throw new Error("STRIPE_PRICE_ID_MISSING");

  const subscription = await db.subscription.findUnique({
    where: { businessId: input.businessId },
    select: { providerCustomerId: true },
  });

  let customerId = subscription?.providerCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: input.ownerEmail,
      metadata: { businessId: input.businessId },
    });
    customerId = customer.id;
    await db.subscription.update({
      where: { businessId: input.businessId },
      data: { provider: "stripe", providerCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { businessId: input.businessId },
    },
    allow_promotion_codes: true,
    metadata: { businessId: input.businessId },
    success_url: `${input.origin}/crm?checkout=success`,
    cancel_url: `${input.origin}/billing?checkout=cancelled`,
  });

  if (!session.url) throw new Error("STRIPE_SESSION_NO_URL");
  return { url: session.url };
}

// Abre o Customer Portal da Stripe (página alojada) para o dono gerir/cancelar
// a subscrição, atualizar o cartão e ver faturas. Requer um cliente Stripe já
// existente (providerCustomerId) e o portal ativado no painel Stripe.
export async function createBillingPortalSession(input: {
  businessId: string;
  origin: string;
}): Promise<{ url: string }> {
  const stripe = requireStripe();

  const subscription = await db.subscription.findUnique({
    where: { businessId: input.businessId },
    select: { providerCustomerId: true },
  });
  if (!subscription?.providerCustomerId) {
    throw new Error("NO_STRIPE_CUSTOMER");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.providerCustomerId,
    return_url: `${input.origin}/crm`,
  });
  return { url: session.url };
}
