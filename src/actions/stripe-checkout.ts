"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-user";
import { isActiveMembership } from "@/lib/billing/membership";
import {
  applyStripeMembershipAction,
  getMembershipForUser,
} from "@/lib/billing/membership-store";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";
import {
  checkoutReturnUrl,
  getStripe,
  isStripeBillingConfigured,
  isStripeSecretConfigured,
  buildStripePaymentLinkUrl,
  safeAppReturnPath,
  siteOrigin,
  stripeEnv,
} from "@/lib/billing/stripe";
import { parseStripeMembershipAction } from "@/lib/billing/stripe-membership";

export type StripeBillingLinkResult =
  | { status: "ok"; url: string }
  | { status: "error"; message: string };

export type StripeCheckoutResult =
  | StripeBillingLinkResult
  | { status: "active" };

function billingError(message: string): StripeBillingLinkResult {
  return { status: "error", message };
}

export async function startStripeCheckoutAction(input: {
  successPath?: string;
  cancelPath?: string;
}): Promise<StripeCheckoutResult> {
  const user = await getCurrentUser();
  if (!user) return billingError("Bitte zuerst anmelden.");
  if (!isStripeBillingConfigured()) {
    return billingError("Stripe ist nicht konfiguriert.");
  }

  const limited = await rateLimit({
    key: `stripe-checkout:${user.id}`,
    limit: RATE_LIMITS.stripeCheckout.limit,
    windowMs: RATE_LIMITS.stripeCheckout.windowMs,
  });
  if (!limited.ok) {
    return billingError("Zu viele Versuche. Bitte in ein paar Minuten erneut.");
  }

  const membership = await getMembershipForUser(user.id);
  if (
    membership &&
    isActiveMembership(membership.status, membership.current_period_end)
  ) {
    return { status: "active" };
  }

  const paymentUrl = buildStripePaymentLinkUrl({
    paymentLink: stripeEnv().paymentLinkUrl,
    userId: user.id,
    email: user.email,
  });
  if (paymentUrl) {
    return { status: "ok", url: paymentUrl };
  }

  if (!isStripeSecretConfigured() || !stripeEnv().priceId) {
    return billingError("Stripe-Checkout ist nicht konfiguriert.");
  }

  const origin = siteOrigin();
  const successPath = safeAppReturnPath(input.successPath ?? "/settings");
  const cancelPath = safeAppReturnPath(input.cancelPath ?? "/settings");
  const successBase = checkoutReturnUrl(origin, successPath, {
    checkout: "success",
  });
  const successUrl = `${successBase}${successBase.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: user.id,
      customer: membership?.stripe_customer_id ?? undefined,
      customer_email:
        membership?.stripe_customer_id || !user.email ? undefined : user.email,
      line_items: [{ price: stripeEnv().priceId, quantity: 1 }],
      locale: "de",
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: checkoutReturnUrl(origin, cancelPath, { checkout: "cancel" }),
      metadata: { user_id: user.id },
      subscription_data: {
        metadata: { user_id: user.id },
      },
    });
    if (!session.url) {
      return billingError("Stripe-Checkout konnte nicht gestartet werden.");
    }
    return { status: "ok", url: session.url };
  } catch (error) {
    console.error("[stripe] checkout create failed", error);
    return billingError("Stripe-Checkout fehlgeschlagen.");
  }
}

export async function startStripePortalAction(input: {
  returnPath?: string;
}): Promise<StripeBillingLinkResult> {
  const user = await getCurrentUser();
  if (!user) return billingError("Bitte zuerst anmelden.");
  if (!isStripeSecretConfigured()) {
    return billingError("Stripe ist nicht konfiguriert.");
  }

  const membership = await getMembershipForUser(user.id);
  if (!membership?.stripe_customer_id) {
    return billingError("Kein Stripe-Kunde für dieses Konto.");
  }

  const origin = siteOrigin();
  const returnPath = safeAppReturnPath(input.returnPath ?? "/settings");

  try {
    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: membership.stripe_customer_id,
      return_url: checkoutReturnUrl(origin, returnPath),
    });
    if (!portal.url) {
      return billingError("Stripe-Portal konnte nicht geöffnet werden.");
    }
    return { status: "ok", url: portal.url };
  } catch (error) {
    console.error("[stripe] portal create failed", error);
    return billingError("Stripe-Portal fehlgeschlagen.");
  }
}

export async function syncStripeCheckoutSessionAction(
  sessionId: string,
): Promise<{ status: "ok" } | { status: "error"; message: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Bitte zuerst anmelden." };
  const id = sessionId.trim();
  if (!id.startsWith("cs_")) {
    return { status: "error", message: "Ungültige Checkout-Session." };
  }
  if (!isStripeSecretConfigured()) {
    return { status: "ok" };
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(id, {
      expand: ["subscription"],
    });
    const metaUser = session.metadata?.user_id ?? session.client_reference_id;
    if (metaUser !== user.id) {
      return { status: "error", message: "Checkout gehört zu einem anderen Konto." };
    }
    const action = parseStripeMembershipAction(
      "checkout.session.completed",
      session as unknown as Record<string, unknown>,
    );
    if (action) {
      await applyStripeMembershipAction({ ...action, userId: user.id });
    }
    revalidatePath("/settings");
    return { status: "ok" };
  } catch (error) {
    console.error("[stripe] session sync failed", error);
    return { status: "error", message: "Zahlung konnte nicht bestätigt werden." };
  }
}
