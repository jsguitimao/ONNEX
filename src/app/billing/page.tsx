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
  // portal para gerir/atualizar o pagamento (ex.: PAST_DUE). Senão, escolher plano.
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
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {hasStripeCustomer ? "Gerir a tua subscrição" : "Escolhe o teu plano"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasStripeCustomer
            ? "Atualiza o pagamento, vê faturas ou cancela quando quiseres."
            : "Começa com 7 dias grátis. Cancela quando quiseres."}
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

        {hasStripeCustomer ? (
          <div className="mt-8">
            <ManageSubscriptionButton
              label="Gerir subscrição / pagamento"
              variant="default"
              size="lg"
              fullWidth
            />
          </div>
        ) : (
          <div className="mt-7 flex flex-col gap-4">
            {/* Plano Trimestral — promocional (destaque) */}
            <div className="relative rounded-xl border-2 border-primary bg-primary/[0.03] p-4 pt-5">
              <span className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
                Promoção −14%
              </span>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-semibold">Trimestral</p>
                  <p className="text-xs text-muted-foreground">antes €77,97</p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="text-2xl font-bold tracking-tight">€66,99</span>
                  <span className="block text-xs font-medium text-muted-foreground">por 3 meses</span>
                </p>
              </div>
              <div className="mt-4">
                <SubscribeButton plan="trimestral" />
              </div>
            </div>

            {/* Plano Mensal */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-semibold">Mensal</p>
                  <p className="text-xs text-muted-foreground">Flexível, sem compromisso</p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="text-2xl font-bold tracking-tight">€25,99</span>
                  <span className="block text-xs font-medium text-muted-foreground">por mês</span>
                </p>
              </div>
              <div className="mt-4">
                <SubscribeButton plan="monthly" variant="outline" />
              </div>
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          Pagamento seguro via Stripe. Após os 7 dias grátis, a subscrição é cobrada
          automaticamente — a conta fica bloqueada se não houver assinatura ativa.
        </p>
      </div>
    </main>
  );
}
