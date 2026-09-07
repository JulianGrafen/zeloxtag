import "server-only";

import { getMembershipForUser } from "@/lib/billing/membership-store";
import { getStripe, isStripeSecretConfigured } from "@/lib/billing/stripe";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

import {
  ACCOUNT_DELETION_GRACE_DAYS,
  ACCOUNT_READ_ONLY_MESSAGE,
  type AccountDeletionState,
  type AccountDeletionStatus,
  daysUntilGraceEnd,
} from "./account-deletion-shared";

export type AccountWritableCheck =
  | { ok: true }
  | { ok: false; message: string; graceEndsAt: string | null };

export {
  ACCOUNT_DELETION_GRACE_DAYS,
  ACCOUNT_READ_ONLY_MESSAGE,
  formatGraceEndDateGerman,
  type AccountDeletionState,
  type AccountDeletionStatus,
} from "./account-deletion-shared";

type DeletionRow = {
  status: string;
  requested_at: string;
  grace_ends_at: string;
};

type DsrEventType =
  | "deletion_requested"
  | "deletion_canceled"
  | "export_downloaded"
  | "purge_completed";

function asDeletionRow(value: unknown): DeletionRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    row.status !== "grace" &&
    row.status !== "canceled" &&
    row.status !== "completed"
  ) {
    return null;
  }
  if (
    typeof row.requested_at !== "string" ||
    typeof row.grace_ends_at !== "string"
  ) {
    return null;
  }
  return {
    status: row.status,
    requested_at: row.requested_at,
    grace_ends_at: row.grace_ends_at,
  };
}

function graceEndsAtFromNow(): string {
  const ends = new Date();
  ends.setUTCDate(ends.getUTCDate() + ACCOUNT_DELETION_GRACE_DAYS);
  return ends.toISOString();
}

function stateFromRow(row: DeletionRow): AccountDeletionState {
  const status = row.status as AccountDeletionStatus;
  return {
    status,
    requestedAt: row.requested_at,
    graceEndsAt: row.grace_ends_at,
    daysRemaining:
      status === "grace" ? daysUntilGraceEnd(row.grace_ends_at) : null,
  };
}

function emptyState(): AccountDeletionState {
  return {
    status: "none",
    requestedAt: null,
    graceEndsAt: null,
    daysRemaining: null,
  };
}

async function readLatestDeletionRequest(
  userId: string,
): Promise<DeletionRow | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("account_deletion_requests")
    .select("status, requested_at, grace_ends_at")
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[account-lifecycle] read failed", error.message);
    return null;
  }
  return asDeletionRow(data);
}

async function appendDsrLog(
  userId: string,
  eventType: DsrEventType,
  metadata: Record<string, Json> = {},
): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  const admin = createAdminClient();
  const { error } = await admin.from("account_data_subject_log").insert({
    user_id: userId,
    event_type: eventType,
    metadata,
  });
  if (error) {
    console.error("[account-lifecycle] dsr log failed", error.message);
  }
}

async function cancelActiveStripeSubscription(userId: string): Promise<void> {
  const membership = await getMembershipForUser(userId);
  const subscriptionId = membership?.stripe_subscription_id?.trim();
  if (!subscriptionId || !isStripeSecretConfigured()) return;

  try {
    const stripe = getStripe();
    await stripe.subscriptions.cancel(subscriptionId);
  } catch (error) {
    console.error(
      "[account-lifecycle] stripe subscription cancel failed",
      error instanceof Error ? error.message : error,
    );
  }
}

export async function getAccountDeletionState(
  userId: string,
): Promise<AccountDeletionState> {
  const row = await readLatestDeletionRequest(userId);
  if (!row) return emptyState();
  return stateFromRow(row);
}

export async function isAccountInDeletionGrace(userId: string): Promise<boolean> {
  const state = await getAccountDeletionState(userId);
  return state.status === "grace";
}

export async function checkAccountWritable(
  userId: string,
): Promise<AccountWritableCheck> {
  if (!(await isAccountInDeletionGrace(userId))) {
    return { ok: true };
  }
  const state = await getAccountDeletionState(userId);
  return {
    ok: false,
    message: ACCOUNT_READ_ONLY_MESSAGE,
    graceEndsAt: state.graceEndsAt,
  };
}

export async function assertAccountWritable(userId: string): Promise<void> {
  const check = await checkAccountWritable(userId);
  if (!check.ok) {
    throw new Error(check.message);
  }
}

export type RequestAccountDeletionResult =
  | { status: "ok"; state: AccountDeletionState }
  | { status: "error"; message: string };

export async function requestAccountDeletion(
  userId: string,
): Promise<RequestAccountDeletionResult> {
  if (!isSupabaseAdminConfigured()) {
    return { status: "error", message: "Supabase ist nicht konfiguriert." };
  }

  const existing = await readLatestDeletionRequest(userId);
  if (existing?.status === "grace") {
    return { status: "ok", state: stateFromRow(existing) };
  }

  await cancelActiveStripeSubscription(userId);

  const graceEndsAt = graceEndsAtFromNow();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("account_deletion_requests")
    .insert({
      user_id: userId,
      status: "grace",
      grace_ends_at: graceEndsAt,
    })
    .select("status, requested_at, grace_ends_at")
    .single();

  if (error) {
    console.error("[account-lifecycle] request insert failed", error.message);
    return {
      status: "error",
      message: "Löschung konnte nicht gestartet werden.",
    };
  }

  const row = asDeletionRow(data);
  if (!row) {
    return { status: "error", message: "Ungültige Server-Antwort." };
  }

  await appendDsrLog(userId, "deletion_requested", {
    grace_ends_at: row.grace_ends_at,
  });

  return { status: "ok", state: stateFromRow(row) };
}

export type CancelAccountDeletionResult =
  | { status: "ok" }
  | { status: "error"; message: string };

export async function cancelAccountDeletion(
  userId: string,
): Promise<CancelAccountDeletionResult> {
  if (!isSupabaseAdminConfigured()) {
    return { status: "error", message: "Supabase ist nicht konfiguriert." };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("account_deletion_requests")
    .update({
      status: "canceled",
      canceled_at: now,
    })
    .eq("user_id", userId)
    .eq("status", "grace")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[account-lifecycle] cancel failed", error.message);
    return {
      status: "error",
      message: "Widerruf konnte nicht gespeichert werden.",
    };
  }
  if (!data) {
    return {
      status: "error",
      message: "Keine aktive Löschung gefunden.",
    };
  }

  await appendDsrLog(userId, "deletion_canceled");
  return { status: "ok" };
}

export type AccountDueForPurge = {
  userId: string;
  requestId: string;
  graceEndsAt: string;
};

export async function listAccountsDueForPurge(
  limit = 50,
): Promise<AccountDueForPurge[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("account_deletion_requests")
    .select("id, user_id, grace_ends_at")
    .eq("status", "grace")
    .lt("grace_ends_at", new Date().toISOString())
    .order("grace_ends_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[account-lifecycle] purge list failed", error.message);
    return [];
  }

  const due: AccountDueForPurge[] = [];
  for (const row of data ?? []) {
    if (
      typeof row.id === "string" &&
      typeof row.user_id === "string" &&
      typeof row.grace_ends_at === "string"
    ) {
      due.push({
        userId: row.user_id,
        requestId: row.id,
        graceEndsAt: row.grace_ends_at,
      });
    }
  }
  return due;
}

export async function markAccountDeletionCompleted(
  userId: string,
  requestId: string,
): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("account_deletion_requests")
    .update({
      status: "completed",
      completed_at: now,
    })
    .eq("id", requestId)
    .eq("user_id", userId)
    .eq("status", "grace");

  if (error) {
    console.error("[account-lifecycle] complete failed", error.message);
    return;
  }

  await appendDsrLog(userId, "purge_completed", { request_id: requestId });
}

export async function logAccountExportDownloaded(
  userId: string,
): Promise<void> {
  await appendDsrLog(userId, "export_downloaded");
}

export async function logAccountPurgeCompleted(
  userId: string,
  requestId?: string,
): Promise<void> {
  await appendDsrLog(
    userId,
    "purge_completed",
    requestId ? { request_id: requestId } : {},
  );
}
