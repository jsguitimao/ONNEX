import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Check } from "lucide-react";
import { SubscribeButton } from "@/components/billing/subscribe-button";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";
import { getCurrentBusiness } from "@/lib/business-modules/core";

export const metadata = {
  title: "Plano Pro",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PRO_FEATURES = [
  "Reservas ilimitadas",
  "WhatsApp + Email automáticos",
  "CRM completo de clientes",
  "Página pública e editor visual",
  "Agenda e equipa",
];

export default async function BillingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/billing");
  }

  // Se o dono já tem um cliente Stripe (passou pelo checkout), oferecemos o
  // portal para gerir/atualizar o pagamento (ex.: PAST_DUE). Senão, subscrever.
  let hasStripeCustomer = false;
  try {
    const business = await getCurrentBusiness();
    hasStripeCustomer = Boolean(business.subscription?.providerCustomerId);
  } catch {
    // Sem negócio/sessão válida: mostramos o fluxo de subscrição normal.
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Onnex Pro
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          €25,99<span className="text-base font-medium text-muted-foreground">/mês</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Começa com <span className="font-medium text-foreground">7 dias grátis</span>. Cancela quando quiseres.
        </p>

        <ul className="mt-6 flex flex-col gap-3">
          {PRO_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-2.5 text-sm">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          {hasStripeCustomer ? (
            <ManageSubscriptionButton
              label="Gerir subscrição / pagamento"
              variant="default"
              size="lg"
              fullWidth
            />
          ) : (
            <SubscribeButton />
          )}
        </div>

        <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
          Pagamento seguro via Stripe. Após os 7 dias, são cobrados €25,99/mês — a conta fica
          bloqueada se não houver assinatura ativa.
        </p>
      </div>
    </main>
  );
}
