"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { getAppUrl } from "@/lib/app-config";
import { getCurrentBusiness } from "@/lib/business-modules/core";
import { createBillingPortalSession, createProCheckoutSession } from "@/lib/billing";
import type { PlanId } from "@/lib/stripe";
import { captureException } from "@/lib/observability";

type CheckoutResult = { ok: true; url: string } | { ok: false; error: string };

// Em localhost usamos o host do pedido; em produção usamos SEMPRE o domínio
// canónico (www.onnex.pt). O apex `onnex.pt` não tem a sessão do Clerk e dá
// erro, por isso os URLs de retorno nunca devem apontar para lá.
async function resolveOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  return host && host.includes("localhost") ? `${proto}://${host}` : getAppUrl();
}

export async function startProCheckoutAction(plan: PlanId = "monthly"): Promise<CheckoutResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };

  try {
    const business = await getCurrentBusiness();

    const user = await currentUser();
    const email =
      user?.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress ??
      null;
    if (!email) return { ok: false, error: "Não encontrámos o teu email." };

    const { url } = await createProCheckoutSession({
      businessId: business.id,
      ownerEmail: email,
      origin: await resolveOrigin(),
      plan,
    });
    return { ok: true, url };
  } catch (error) {
    captureException("billing.start_checkout_failed", error, { userId });
    return { ok: false, error: "Não foi possível iniciar o pagamento. Tenta novamente." };
  }
}

// Abre o Customer Portal da Stripe para o dono gerir/cancelar a subscrição.
export async function openCustomerPortalAction(): Promise<CheckoutResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sessão expirada. Inicia sessão novamente." };

  try {
    const business = await getCurrentBusiness();
    const { url } = await createBillingPortalSession({
      businessId: business.id,
      origin: await resolveOrigin(),
    });
    return { ok: true, url };
  } catch (error) {
    captureException("billing.open_portal_failed", error, { userId });
    return { ok: false, error: "Não foi possível abrir a gestão da subscrição. Tenta novamente." };
  }
}
