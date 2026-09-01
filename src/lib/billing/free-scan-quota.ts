import { cache } from "react";

import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/** One complimentary KI invoice scan per vehicle owner account. */
export const FREE_AI_INVOICE_SCAN_LIMIT = 1;

export type FreeInvoiceScanQuota = {
  used: number;
  remaining: number;
  limit: number;
};

async function loadFreeInvoiceScansUsed(userId: string): Promise<number> {
  if (!userId || !isSupabaseAdminConfigured()) return 0;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_entitlements")
    .select("free_ai_invoice_scans_used")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[free-scan] read failed", error.message);
    return 0;
  }

  const used = data?.free_ai_invoice_scans_used;
  return typeof used === "number" && Number.isFinite(used) && used > 0
    ? Math.floor(used)
    : 0;
}

const getFreeInvoiceScanQuotaUncached = async (
  userId: string,
): Promise<FreeInvoiceScanQuota> => {
  const used = await loadFreeInvoiceScansUsed(userId);
  const remaining = Math.max(0, FREE_AI_INVOICE_SCAN_LIMIT - used);
  return {
    used,
    remaining,
    limit: FREE_AI_INVOICE_SCAN_LIMIT,
  };
};

/** Request-memoized quota lookup for dashboard render. */
export const getFreeInvoiceScanQuota = cache(getFreeInvoiceScanQuotaUncached);

export async function ownerHasFreeInvoiceScanRemaining(
  ownerUserId: string,
): Promise<boolean> {
  const quota = await getFreeInvoiceScanQuota(ownerUserId);
  return quota.remaining > 0;
}

export async function ownerCanUseAiInvoiceScan(
  ownerUserId: string,
): Promise<boolean> {
  if (!ownerUserId) return false;
  if (await userHasActiveMembership(ownerUserId)) return true;
  return ownerHasFreeInvoiceScanRemaining(ownerUserId);
}

/**
 * Atomically consume one free invoice scan slot for the owner.
 * Returns false when the limit is already reached.
 */
export async function consumeFreeInvoiceScan(
  ownerUserId: string,
): Promise<boolean> {
  if (!ownerUserId || !isSupabaseAdminConfigured()) return false;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_free_ai_invoice_scan", {
    p_user_id: ownerUserId,
    p_limit: FREE_AI_INVOICE_SCAN_LIMIT,
  });

  if (error) {
    console.error("[free-scan] consume failed", error.message);
    return false;
  }

  return data === true;
}
