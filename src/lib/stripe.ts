import Stripe from "stripe";

// Cliente Stripe (server-side). Tolerante: se a STRIPE_SECRET_KEY não estiver
// configurada, fica `null` e o chamador trata como "Stripe não configurado"
// (sem partir o build nem o arranque). A apiVersion fica a do SDK por defeito.
const secretKey = process.env.STRIPE_SECRET_KEY?.trim() || null;

export const stripe = secretKey ? new Stripe(secretKey) : null;

/** O ID do preço (Price) do plano Pro — €25,99/mês. */
export function getStripePriceId(): string | null {
  return process.env.STRIPE_PRICE_ID?.trim() || null;
}

/** Devolve o cliente Stripe ou lança se não estiver configurado. */
export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }
  return stripe;
}
