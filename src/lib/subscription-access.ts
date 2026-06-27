// Regra única de acesso à plataforma (paywall do Pro).
//
// Acesso ativo = subscrição Stripe em TRIAL (não expirado) OU ACTIVE.
// Como o cartão é à entrada, um TRIALING "local" criado com o negócio (sem
// cliente Stripe) NÃO dá acesso — o dono tem de passar pelo checkout primeiro.

export type AccessSubscription =
  | {
      status: string;
      providerCustomerId: string | null;
      currentPeriodEnd: Date | null;
    }
  | null
  | undefined;

export function hasActiveAccess(sub: AccessSubscription): boolean {
  if (!sub) return false;
  if (sub.status === "ACTIVE") return true;
  if (sub.status === "TRIALING") {
    // Trial só conta se for um trial real da Stripe (cartão recolhido).
    if (!sub.providerCustomerId) return false;
    // Margem de segurança: se o fim do período já passou e o webhook ainda
    // não transitou o estado, tratamos como sem acesso.
    if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < Date.now()) return false;
    return true;
  }
  // PAST_DUE, CANCELLED, ou qualquer outro → bloqueado.
  return false;
}
