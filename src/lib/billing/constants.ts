export const SHOPIFY_WEBHOOK_API_PATH = "/api/shopify/webhook";
export const STRIPE_WEBHOOK_API_PATH = "/api/stripe/webhook";

/** Public Stripe Payment Link for ZeloxTag Cloud (Pro Abo, monthly). */
export const STRIPE_PRO_PAYMENT_LINK =
  "https://buy.stripe.com/bJefZb2B3dKEbmVb3B0sU00";

/** Public Stripe Payment Link for ZeloxTag Cloud Pro Jahresabo. */
export const STRIPE_PRO_ANNUAL_PAYMENT_LINK =
  "https://buy.stripe.com/bJe00d5NfcGA62BgnV0sU01";

/** Client-safe: annual checkout is available when link or public env is set. */
export function isAnnualPlanAvailable(): boolean {
  const fromEnv = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL_ANNUAL?.trim();
  return Boolean(fromEnv || STRIPE_PRO_ANNUAL_PAYMENT_LINK);
}
