import "server-only";

import {
  ownerCanUseAiAbeScan,
  ownerCanUseAiInvoiceScan,
} from "@/lib/billing/free-scan-quota";
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import type { FeatureGateOptions } from "@/lib/permissions/require-feature";

/**
 * Supabase-backed Pro subscription check (memberships table via admin client).
 *
 * Stripe `trialing` is persisted as `active` with a valid `current_period_end`
 * (see stripe-membership webhook mapping). Grace window in `isActiveMembership`.
 */
export async function ownerHasProSubscription(
  ownerUserId: string,
): Promise<boolean> {
  if (!ownerUserId) return false;
  return userHasActiveMembership(ownerUserId);
}

/**
 * Backend paywall gate: Pro subscription OR remaining complimentary scan slot.
 * Used before OCR, vault writes, and expose generation — never trust the UI alone.
 */
export async function ownerMayUseProFeature(
  ownerUserId: string,
  options?: FeatureGateOptions,
): Promise<boolean> {
  if (await ownerHasProSubscription(ownerUserId)) return true;

  if (
    options?.allowFreeInvoiceScan &&
    (await ownerCanUseAiInvoiceScan(ownerUserId))
  ) {
    return true;
  }

  if (options?.allowFreeAbeScan && (await ownerCanUseAiAbeScan(ownerUserId))) {
    return true;
  }

  return false;
}
