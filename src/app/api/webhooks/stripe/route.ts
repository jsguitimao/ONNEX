import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { captureException } from "@/lib/observability";
import { requireStripe } from "@/lib/stripe";
import { syncSubscription } from "@/lib/stripe-sync";

export const runtime = "nodejs";

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
