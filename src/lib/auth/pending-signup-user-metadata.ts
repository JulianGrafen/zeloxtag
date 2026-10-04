import "server-only";

import type { PendingGarageVehicle } from "@/lib/hardware/pending-garage-vehicle";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import type { PendingClaim } from "@/lib/tags/pending-claim";
import { logServerError } from "@/lib/security/public-error";

export const PENDING_GARAGE_VEHICLE_META_KEY = "pending_garage_vehicle";
export const PENDING_TAG_CLAIM_META_KEY = "pending_tag_claim";

async function readUserMetadata(
  userId: string,
): Promise<Record<string, unknown> | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    if (error) {
      logServerError("[pending-signup-metadata] getUserById failed", error);
    }
    return null;
  }
  const meta = data.user.user_metadata;
  return meta && typeof meta === "object" && !Array.isArray(meta)
    ? (meta as Record<string, unknown>)
    : {};
}

async function patchUserMetadata(
  userId: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;
  const current = await readUserMetadata(userId);
  if (!current) return false;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...current, ...patch },
  });
  if (error) {
    logServerError("[pending-signup-metadata] updateUserById failed", error);
    return false;
  }
  return true;
}

function isPendingGarageVehicle(value: unknown): value is PendingGarageVehicle {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const parsed = value as PendingGarageVehicle;
  return (
    typeof parsed.make === "string" &&
    typeof parsed.model === "string" &&
    typeof parsed.year === "number" &&
    typeof parsed.email === "string" &&
    (parsed.vin === null || typeof parsed.vin === "string") &&
    (parsed.name === null || typeof parsed.name === "string")
  );
}

function isPendingClaim(value: unknown): value is PendingClaim {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const parsed = value as PendingClaim;
  return (
    typeof parsed.tagUuid === "string" &&
    typeof parsed.make === "string" &&
    typeof parsed.model === "string" &&
    typeof parsed.year === "number" &&
    typeof parsed.email === "string" &&
    (parsed.vin === null || typeof parsed.vin === "string") &&
    (parsed.name === null || typeof parsed.name === "string")
  );
}

export async function savePendingGarageVehicleForUser(
  userId: string,
  payload: PendingGarageVehicle,
): Promise<void> {
  await patchUserMetadata(userId, {
    [PENDING_GARAGE_VEHICLE_META_KEY]: payload,
  });
}

export async function loadPendingGarageVehicleForUser(
  userId: string,
): Promise<PendingGarageVehicle | null> {
  const meta = await readUserMetadata(userId);
  if (!meta) return null;
  const raw = meta[PENDING_GARAGE_VEHICLE_META_KEY];
  return isPendingGarageVehicle(raw) ? raw : null;
}

export async function clearPendingGarageVehicleForUser(
  userId: string,
): Promise<void> {
  await patchUserMetadata(userId, {
    [PENDING_GARAGE_VEHICLE_META_KEY]: null,
  });
}

export async function savePendingClaimForUser(
  userId: string,
  payload: PendingClaim,
): Promise<void> {
  await patchUserMetadata(userId, {
    [PENDING_TAG_CLAIM_META_KEY]: payload,
  });
}

export async function loadPendingClaimForUser(
  userId: string,
): Promise<PendingClaim | null> {
  const meta = await readUserMetadata(userId);
  if (!meta) return null;
  const raw = meta[PENDING_TAG_CLAIM_META_KEY];
  return isPendingClaim(raw) ? raw : null;
}

export async function clearPendingClaimForUser(userId: string): Promise<void> {
  await patchUserMetadata(userId, {
    [PENDING_TAG_CLAIM_META_KEY]: null,
  });
}
