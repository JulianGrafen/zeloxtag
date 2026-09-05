import "server-only";

import { cache } from "react";
import { z } from "zod";

import {
  FREE_AI_ABE_SCAN_LIMIT,
  FREE_AI_INVOICE_SCAN_LIMIT,
} from "@/lib/billing/free-scan-constants";
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import type { OcrDocumentType } from "@/lib/ocr/ocr-types";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export type FreeScanGateOptions = {
  allowFreeInvoiceScan?: boolean;
  allowFreeAbeScan?: boolean;
};

export type FreeScanKind = "invoice" | "abe";

export type FreeScanQuota = {
  used: number;
  remaining: number;
  limit: number;
};

export type FreeInvoiceScanQuota = FreeScanQuota;
export type FreeAbeScanQuota = FreeScanQuota;

const scanSessionIdSchema = z.string().uuid();

type EntitlementRow = {
  invoiceUsed: number;
  abeUsed: number;
  loadError: boolean;
};

async function loadEntitlementRow(userId: string): Promise<EntitlementRow> {
  if (!userId || !isSupabaseAdminConfigured()) {
    return { invoiceUsed: 0, abeUsed: 0, loadError: true };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_entitlements")
    .select("free_ai_invoice_scans_used, free_ai_abe_scans_used")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[free-scan] read failed", error.message);
    return { invoiceUsed: 0, abeUsed: 0, loadError: true };
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
    loadError: false,
  };
}

function toQuota(used: number, limit: number, loadError = false): FreeScanQuota {
  if (loadError) {
    return { used: limit, remaining: 0, limit };
  }
  const remaining = Math.max(0, limit - used);
  return { used, remaining, limit };
}

const getFreeInvoiceScanQuotaUncached = async (
  userId: string,
): Promise<FreeInvoiceScanQuota> => {
  const row = await loadEntitlementRow(userId);
  return toQuota(row.invoiceUsed, FREE_AI_INVOICE_SCAN_LIMIT, row.loadError);
};

const getFreeAbeScanQuotaUncached = async (
  userId: string,
): Promise<FreeAbeScanQuota> => {
  const row = await loadEntitlementRow(userId);
  return toQuota(row.abeUsed, FREE_AI_ABE_SCAN_LIMIT, row.loadError);
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
  if (!isSupabaseAdminConfigured()) return false;
  return ownerHasFreeInvoiceScanRemaining(ownerUserId);
}

export async function ownerCanUseAiAbeScan(
  ownerUserId: string,
): Promise<boolean> {
  if (!ownerUserId) return false;
  if (await userHasActiveMembership(ownerUserId)) return true;
  if (!isSupabaseAdminConfigured()) return false;
  return ownerHasFreeAbeScanRemaining(ownerUserId);
}

export function parseScanSessionId(
  raw: FormData | string | null | undefined,
): string | null {
  const value =
    raw instanceof FormData
      ? String(raw.get("scanSessionId") ?? "").trim()
      : raw?.trim() ?? "";
  if (!value) return null;
  const parsed = scanSessionIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function freeScanKindForDocumentType(
  documentType?: OcrDocumentType,
): FreeScanKind | null {
  if (documentType === "invoice") return "invoice";
  if (documentType === "abe") return "abe";
  return null;
}

export type BeginFreeScanSessionResult =
  | { ok: true; sessionId: string; started: boolean }
  | { ok: false; code: "free_scan_exhausted" | "quota_unavailable" | "invalid_session" };

export async function validateFreeScanSession(
  sessionId: string,
  ownerUserId: string,
  vehicleId: string,
  kind: FreeScanKind,
): Promise<boolean> {
  if (!sessionId || !ownerUserId || !vehicleId || !isSupabaseAdminConfigured()) {
    return false;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("validate_free_scan_session", {
    p_session_id: sessionId,
    p_user_id: ownerUserId,
    p_vehicle_id: vehicleId,
    p_kind: kind,
  });

  if (error) {
    console.error("[free-scan] validate session failed", error.message);
    return false;
  }

  return data === true;
}

/**
 * Begin or reuse a complimentary OCR session. Consumes quota atomically on first begin.
 */
export async function beginFreeScanSession(
  ownerUserId: string,
  kind: FreeScanKind,
  vehicleId: string,
  existingSessionId?: string | null,
): Promise<BeginFreeScanSessionResult> {
  if (!ownerUserId || !vehicleId || !isSupabaseAdminConfigured()) {
    return { ok: false, code: "quota_unavailable" };
  }

  if (await userHasActiveMembership(ownerUserId)) {
    return { ok: false, code: "quota_unavailable" };
  }

  const admin = createAdminClient();
  const parsedExisting = existingSessionId
    ? scanSessionIdSchema.safeParse(existingSessionId)
    : null;

  if (parsedExisting?.success) {
    const valid = await validateFreeScanSession(
      parsedExisting.data,
      ownerUserId,
      vehicleId,
      kind,
    );
    if (valid) {
      return { ok: true, sessionId: parsedExisting.data, started: false };
    }
    return { ok: false, code: "invalid_session" };
  }

  const { data, error } = await admin.rpc("begin_free_scan_session", {
    p_user_id: ownerUserId,
    p_kind: kind,
    p_vehicle_id: vehicleId,
    p_session_id: null,
  });

  if (error) {
    console.error("[free-scan] begin session failed", error.message);
    return { ok: false, code: "quota_unavailable" };
  }

  if (typeof data !== "string" || !data) {
    const row = await loadEntitlementRow(ownerUserId);
    if (row.loadError) {
      return { ok: false, code: "quota_unavailable" };
    }
    const limit =
      kind === "invoice" ? FREE_AI_INVOICE_SCAN_LIMIT : FREE_AI_ABE_SCAN_LIMIT;
    const used = kind === "invoice" ? row.invoiceUsed : row.abeUsed;
    if (used >= limit) {
      return { ok: false, code: "free_scan_exhausted" };
    }
    return { ok: false, code: "quota_unavailable" };
  }

  return { ok: true, sessionId: data, started: true };
}

export function withScanSessionId<T extends Record<string, unknown>>(
  body: T,
  scanSessionId?: string,
): T & { scanSessionId?: string } {
  if (!scanSessionId) return body;
  return { ...body, scanSessionId };
}

/**
 * @deprecated Replaced by beginFreeScanSession in requireVehicleOcrAccess.
 */
export async function tryConsumeFreeOcrScanForOwner(
  ownerUserId: string,
  gateOptions: FreeScanGateOptions,
  documentType?: OcrDocumentType,
): Promise<
  | { ok: true; consumed: false }
  | { ok: false; code: "free_scan_exhausted" | "quota_unavailable" }
> {
  if (!ownerUserId) {
    return { ok: false, code: "quota_unavailable" };
  }

  if (!isSupabaseAdminConfigured()) {
    return { ok: false, code: "quota_unavailable" };
  }

  if (await userHasActiveMembership(ownerUserId)) {
    return { ok: true, consumed: false };
  }

  const kind = freeScanKindForDocumentType(documentType);
  if (!kind) return { ok: true, consumed: false };

  if (
    (kind === "invoice" && gateOptions.allowFreeInvoiceScan !== true) ||
    (kind === "abe" && gateOptions.allowFreeAbeScan !== true)
  ) {
    return { ok: true, consumed: false };
  }

  if (kind === "invoice") {
    if (await ownerHasFreeInvoiceScanRemaining(ownerUserId)) {
      return { ok: true, consumed: false };
    }
    const row = await loadEntitlementRow(ownerUserId);
    if (row.loadError) return { ok: false, code: "quota_unavailable" };
    if (row.invoiceUsed >= FREE_AI_INVOICE_SCAN_LIMIT) {
      return { ok: false, code: "free_scan_exhausted" };
    }
    return { ok: false, code: "quota_unavailable" };
  }

  if (await ownerHasFreeAbeScanRemaining(ownerUserId)) {
    return { ok: true, consumed: false };
  }
  const row = await loadEntitlementRow(ownerUserId);
  if (row.loadError) return { ok: false, code: "quota_unavailable" };
  if (row.abeUsed >= FREE_AI_ABE_SCAN_LIMIT) {
    return { ok: false, code: "free_scan_exhausted" };
  }
  return { ok: false, code: "quota_unavailable" };
}

/** Legacy direct consume — prefer session flow for OCR + upload. */
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

/** Legacy direct consume — prefer session flow for OCR + upload. */
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
