"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { getAppUrl } from "@/lib/app-config";
import { getCurrentBusiness } from "@/lib/business-modules/core";
import { createProCheckoutSession } from "@/lib/billing";
import { captureException } from "@/lib/observability";

type CheckoutResult = { ok: true; url: string } | { ok: false; error: string };

export async function startProCheckoutAction(): Promise<CheckoutResult> {
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

    const requestHeaders = await headers();
    const host = requestHeaders.get("host");
    const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
    const origin = host ? `${proto}://${host}` : getAppUrl();

    const { url } = await createProCheckoutSession({
      businessId: business.id,
      ownerEmail: email,
      origin,
    });
    return { ok: true, url };
  } catch (error) {
    captureException("billing.start_checkout_failed", error, { userId });
    return { ok: false, error: "Não foi possível iniciar o pagamento. Tenta novamente." };
  }
}
