import { getCurrentUser } from "@/lib/auth/get-user";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type VehicleAccess = {
  /** Session user owns this vehicle. */
  isOwner: boolean;
  /** Active Schrauber / contributor on this vehicle. */
  isContributor: boolean;
  /** Owner or Schrauber may add invoices / repairs. */
  canWriteInvoices: boolean;
  /**
   * Schrauber may browse existing invoices (owner toggle).
   * Owners always true; guests false.
   */
  canReadHistory: boolean;
  /** Only the owner manages invites. */
  canManageContributors: boolean;
  /** Display name of the vehicle owner (never the wrong session user). */
  ownerName: string;
  /** Email of the current session, if any. */
  sessionEmail: string | null;
  sessionUserId: string | null;
};

function displayNameFromUser(user: {
  email?: string | null;
  user_metadata?: { name?: unknown };
}): string {
  if (
    typeof user.user_metadata?.name === "string" &&
    user.user_metadata.name.trim()
  ) {
    return user.user_metadata.name.trim();
  }
  if (user.email) {
    return user.email.split("@")[0] || "Fahrer";
  }
  return "Fahrer";
}

async function loadContributorGrant(
  vehicleId: string,
  sessionUserId: string,
): Promise<{ active: boolean; canReadHistory: boolean }> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("vehicle_contributors")
      .select("id, can_read_history")
      .eq("vehicle_id", vehicleId)
      .eq("user_id", sessionUserId)
      .eq("status", "active")
      .maybeSingle();

    if (!data) {
      return { active: false, canReadHistory: false };
    }

    // Column missing before migration → treat as full history (legacy).
    const canReadHistory =
      typeof data.can_read_history === "boolean"
        ? data.can_read_history
        : true;

    return { active: true, canReadHistory };
  } catch {
    return { active: false, canReadHistory: false };
  }
}

/**
 * Resolves owner vs Schrauber vs guest access for a claimed vehicle.
 */
export async function getVehicleAccess(
  vehicleUserId: string,
  vehicleId?: string | null,
): Promise<VehicleAccess> {
  const session = await getCurrentUser();
  const sessionUserId = session?.id ?? null;
  const sessionEmail = session?.email ?? null;
  const isOwner = Boolean(
    sessionUserId && vehicleUserId && sessionUserId === vehicleUserId,
  );

  let isContributor = false;
  let canReadHistory = isOwner;
  if (!isOwner && sessionUserId && vehicleId) {
    const grant = await loadContributorGrant(vehicleId, sessionUserId);
    isContributor = grant.active;
    canReadHistory = grant.active ? grant.canReadHistory : false;
  }

  const base = {
    isOwner,
    isContributor,
    canWriteInvoices: isOwner || isContributor,
    canReadHistory,
    canManageContributors: isOwner,
    sessionEmail,
    sessionUserId,
  };

  let ownerName = "Fahrer";

  if (isOwner && session) {
    return {
      ...base,
      ownerName: displayNameFromUser(session),
    };
  }

  // Guests / foreign sessions must not learn the owner's email or display name.
  if (!isOwner && !isContributor) {
    return { ...base, ownerName: "Eigentümer" };
  }

  if (!vehicleUserId) {
    return { ...base, ownerName };
  }

  const { isConfigured } = getSupabaseEnv();
  if (isConfigured && isSupabaseAdminConfigured()) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.getUserById(vehicleUserId);
      if (!error && data.user) {
        ownerName = displayNameFromUser(data.user);
      }
    } catch {
      // Keep fallback label.
    }
  }

  return { ...base, ownerName };
}

/**
 * Ownership check that still works when the public RPC stripped `user_id`.
 */
export async function sessionOwnsTagVehicle(
  tagUuid: string,
  sessionUserId: string,
): Promise<{ isOwner: boolean; vehicleId: string | null }> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured || !isSupabaseAdminConfigured()) {
    return { isOwner: false, vehicleId: null };
  }

  const admin = createAdminClient();
  const { data: tag } = await admin
    .from("tags")
    .select("vehicle_id, status")
    .eq("uuid", tagUuid)
    .maybeSingle();

  if (!tag?.vehicle_id || tag.status !== "active") {
    return { isOwner: false, vehicleId: null };
  }

  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id")
    .eq("id", tag.vehicle_id)
    .eq("user_id", sessionUserId)
    .maybeSingle();

  return {
    isOwner: Boolean(vehicle),
    vehicleId: tag.vehicle_id,
  };
}

/**
 * Access helper for tag pages — uses vehicle.user_id when present, otherwise
 * probes ownership via service role (public twin RPC redacts owner id).
 */
export async function getTagVehicleAccess(
  tagUuid: string,
  vehicleUserId: string | null | undefined,
  vehicleIdHint?: string | null,
): Promise<VehicleAccess> {
  const session = await getCurrentUser();
  const sessionUserId = session?.id ?? null;
  const sessionEmail = session?.email ?? null;

  let vehicleId: string | null = vehicleIdHint?.trim() || null;
  if (!vehicleId && isSupabaseAdminConfigured()) {
    try {
      const admin = createAdminClient();
      const { data: tag } = await admin
        .from("tags")
        .select("vehicle_id")
        .eq("uuid", tagUuid)
        .maybeSingle();
      vehicleId = tag?.vehicle_id ?? null;
    } catch {
      vehicleId = null;
    }
  }

  if (vehicleUserId) {
    return getVehicleAccess(vehicleUserId, vehicleId);
  }

  if (sessionUserId) {
    const owned = await sessionOwnsTagVehicle(tagUuid, sessionUserId);
    if (owned.isOwner) {
      return {
        isOwner: true,
        isContributor: false,
        canWriteInvoices: true,
        canReadHistory: true,
        canManageContributors: true,
        ownerName: displayNameFromUser(session!),
        sessionEmail,
        sessionUserId,
      };
    }

    if (owned.vehicleId) {
      const grant = await loadContributorGrant(owned.vehicleId, sessionUserId);
      if (grant.active) {
        return {
          isOwner: false,
          isContributor: true,
          canWriteInvoices: true,
          canReadHistory: grant.canReadHistory,
          canManageContributors: false,
          ownerName: "Fahrer",
          sessionEmail,
          sessionUserId,
        };
      }
    }
  }

  return {
    isOwner: false,
    isContributor: false,
    canWriteInvoices: false,
    canReadHistory: false,
    canManageContributors: false,
    ownerName: "Fahrer",
    sessionEmail,
    sessionUserId,
  };
}
