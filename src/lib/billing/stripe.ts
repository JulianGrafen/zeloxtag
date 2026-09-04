import Stripe from "stripe";

import { resolvePublicSiteOrigin } from "@/lib/site-origin";
import { STRIPE_PRO_PAYMENT_LINK } from "./constants";
import type { ProBillingInterval } from "./pro-plan";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function stripeEnv(): {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  priceId: string;
  priceIdAnnual: string;
  paymentLinkUrl: string;
} {
  return {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "",
    secretKey: process.env.STRIPE_SECRET_KEY?.trim() ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "",
    priceId: process.env.STRIPE_PRICE_ID?.trim() ?? "",
    priceIdAnnual: process.env.STRIPE_PRICE_ID_ANNUAL?.trim() ?? "",
    paymentLinkUrl:
      process.env.STRIPE_PAYMENT_LINK_URL?.trim() || STRIPE_PRO_PAYMENT_LINK,
  };
}

export function resolveStripePriceId(interval: ProBillingInterval): string {
  const { priceId, priceIdAnnual } = stripeEnv();
  return interval === "annual" ? priceIdAnnual : priceId;
}

export function isAnnualPlanConfigured(): boolean {
  return Boolean(stripeEnv().priceIdAnnual);
}

export function canCheckoutStripeInterval(interval: ProBillingInterval): boolean {
  if (interval === "monthly" && isStripePaymentLink(stripeEnv().paymentLinkUrl)) {
    return true;
  }
  return Boolean(isStripeSecretConfigured() && resolveStripePriceId(interval));
}

export function isStripeSecretConfigured(): boolean {
  return Boolean(stripeEnv().secretKey);
}

export function isStripePaymentLink(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      url.hostname === "buy.stripe.com" &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
}

export function isStripeBillingConfigured(): boolean {
  const { secretKey, priceId, priceIdAnnual, paymentLinkUrl } = stripeEnv();
  return (
    isStripePaymentLink(paymentLinkUrl) ||
    Boolean(secretKey && (priceId || priceIdAnnual))
  );
}

/**
 * Payment Link with ZeloxTag user id so checkout.session.completed can attach
 * the membership. Stripe reads `client_reference_id` from the query string.
 */
export function buildStripePaymentLinkUrl(input: {
  paymentLink: string;
  userId: string;
  email?: string | null;
}): string | null {
  if (!isStripePaymentLink(input.paymentLink) || !UUID_RE.test(input.userId)) {
    return null;
  }
  const url = new URL(input.paymentLink);
  url.searchParams.set("client_reference_id", input.userId);
  const email = input.email?.trim();
  if (email && email.includes("@")) {
    url.searchParams.set("prefilled_email", email);
  }
  url.searchParams.set("locale", "de");
  return url.toString();
}

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const { secretKey } = stripeEnv();
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

export function siteOrigin(): string {
  return resolvePublicSiteOrigin();
}

/** Relative app path only — blocks open redirects into Stripe success/cancel URLs. */
export function safeAppReturnPath(raw: string | null | undefined): string {
  const path = (raw ?? "").trim() || "/settings";
  if (!path.startsWith("/") || path.startsWith("//") || /[a-z]+:/i.test(path)) {
    return "/settings";
  }
  if (/[\r\n\\]/.test(path)) return "/settings";
  return path;
}

export function checkoutReturnUrl(
  origin: string,
  path: string,
  extraQuery?: Record<string, string>,
): string {
  const url = new URL(path, `${origin}/`);
  if (url.origin !== new URL(origin).origin) {
    return `${origin}/settings`;
  }
  if (extraQuery) {
    for (const [key, value] of Object.entries(extraQuery)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}
