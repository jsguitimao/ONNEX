import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { captureException } from "@/lib/observability";
import { requireStripe } from "@/lib/stripe";

export const runtime = "nodejs";

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

async function syncSubscription(sub: Stripe.Subscription) {
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

export async function POST(req: Request) {
  const stripe = requireStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "WEBHOOK_NOT_CONFIGURED" }, { status: 500 });
  }

  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "MISSING_SIGNATURE" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    captureException("stripe.webhook_bad_signature", error);
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;
      default:
        // Outros eventos ignorados por agora.
        break;
    }
  } catch (error) {
    captureException("stripe.webhook_handler_failed", error, { type: event.type });
    return NextResponse.json({ error: "HANDLER_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
