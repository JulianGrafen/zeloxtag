import type { Membership } from "@/types/database";

export type BillingProvider = "stripe" | "shopify" | "revenuecat";

export function isRevenueCatManagedMembership(
  membership: Pick<
    Membership,
    "billing_provider" | "revenuecat_app_user_id"
  > | null,
): boolean {
  if (!membership) return false;
  return (
    membership.billing_provider === "revenuecat" ||
    Boolean(membership.revenuecat_app_user_id)
  );
}

export function isStripeManagedMembership(
  membership: Pick<
    Membership,
    "billing_provider" | "stripe_subscription_id"
  > | null,
): boolean {
  if (!membership) return false;
  return (
    membership.billing_provider === "stripe" ||
    Boolean(membership.stripe_subscription_id)
  );
}

export function isShopifyManagedMembership(
  membership: Pick<Membership, "billing_provider" | "shopify_order_id"> | null,
): boolean {
  if (!membership) return false;
  return membership.billing_provider === "shopify";
}

/** Shopify webhooks must not revoke an active Stripe Cloud Abo. */
export function shopifyMayUpdateEntitlement(
  membership: Membership | null,
): boolean {
  return (
    !isStripeManagedMembership(membership) &&
    !isRevenueCatManagedMembership(membership)
  );
}
