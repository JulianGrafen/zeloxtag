import "server-only";

import { cache } from "react";

import {
  FREE_AI_ABE_SCAN_LIMIT,
  FREE_AI_INVOICE_SCAN_LIMIT,
} from "@/lib/billing/free-scan-constants";
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export type FreeScanQuota = {
  used: number;
  remaining: number;
  limit: number;
};

export type FreeInvoiceScanQuota = FreeScanQuota;
export type FreeAbeScanQuota = FreeScanQuota;

async function loadEntitlementRow(userId: string): Promise<{
  invoiceUsed: number;
  abeUsed: number;
}> {
  if (!userId || !isSupabaseAdminConfigured()) {
    return { invoiceUsed: 0, abeUsed: 0 };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_entitlements")
    .select("free_ai_invoice_scans_used, free_ai_abe_scans_used")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[free-scan] read failed", error.message);
    return { invoiceUsed: 0, abeUsed: 0 };
  }

  const invoiceUsed = data?.free_ai_invoice_scans_used;
  const abeUsed = data?.free_ai_abe_scans_used;

  return {
    invoiceUsed:
      typeof invoiceUsed === "number" && Number.isFinite(invoiceUsed) && invoiceUsed > 0
        ? Math.floor(invoiceUsed)
        : 0,
    abeUsed:
      typeof abeUsed === "number" && Number.isFinite(abeUsed) && abeUsed > 0
        ? Math.floor(abeUsed)
        : 0,
  };
}

function toQuota(used: number, limit: number): FreeScanQuota {
  const remaining = Math.max(0, limit - used);
  return { used, remaining, limit };
}

const getFreeInvoiceScanQuotaUncached = async (
  userId: string,
): Promise<FreeInvoiceScanQuota> => {
  const { invoiceUsed } = await loadEntitlementRow(userId);
  return toQuota(invoiceUsed, FREE_AI_INVOICE_SCAN_LIMIT);
};

const getFreeAbeScanQuotaUncached = async (
  userId: string,
): Promise<FreeAbeScanQuota> => {
  const { abeUsed } = await loadEntitlementRow(userId);
  return toQuota(abeUsed, FREE_AI_ABE_SCAN_LIMIT);
};

/** Request-memoized quota lookup for dashboard render. */
export const getFreeInvoiceScanQuota = cache(getFreeInvoiceScanQuotaUncached);
export const getFreeAbeScanQuota = cache(getFreeAbeScanQuotaUncached);

export async function ownerHasFreeInvoiceScanRemaining(
  ownerUserId: string,
): Promise<boolean> {
  const quota = await getFreeInvoiceScanQuota(ownerUserId);
  return quota.remaining > 0;
}

export async function ownerHasFreeAbeScanRemaining(
  ownerUserId: string,
): Promise<boolean> {
  const quota = await getFreeAbeScanQuota(ownerUserId);
  return quota.remaining > 0;
}

export async function ownerHasAnyFreeScanRemaining(
  ownerUserId: string,
): Promise<boolean> {
  if (!ownerUserId) return false;
  const [invoice, abe] = await Promise.all([
    ownerHasFreeInvoiceScanRemaining(ownerUserId),
    ownerHasFreeAbeScanRemaining(ownerUserId),
  ]);
  return invoice || abe;
}

export async function ownerCanUseAiInvoiceScan(
  ownerUserId: string,
): Promise<boolean> {
  if (!ownerUserId) return false;
  if (await userHasActiveMembership(ownerUserId)) return true;
  return ownerHasFreeInvoiceScanRemaining(ownerUserId);
}

export async function ownerCanUseAiAbeScan(
  ownerUserId: string,
): Promise<boolean> {
  if (!ownerUserId) return false;
  if (await userHasActiveMembership(ownerUserId)) return true;
  return ownerHasFreeAbeScanRemaining(ownerUserId);
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
    console.error("[free-scan] consume invoice failed", error.message);
    return false;
  }

  return data === true;
}

/**
 * Atomically consume one free ABE scan slot for the owner.
 * Returns false when the limit is already reached.
 */
export async function consumeFreeAbeScan(
  ownerUserId: string,
): Promise<boolean> {
  if (!ownerUserId || !isSupabaseAdminConfigured()) return false;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_free_ai_abe_scan", {
    p_user_id: ownerUserId,
    p_limit: FREE_AI_ABE_SCAN_LIMIT,
  });

  if (error) {
    console.error("[free-scan] consume abe failed", error.message);
    return false;
  }

  return data === true;
}
