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

async function sessionIsActiveContributor(
  vehicleId: string,
  sessionUserId: string,
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("vehicle_contributors")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .eq("user_id", sessionUserId)
      .eq("status", "active")
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
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
  if (!isOwner && sessionUserId && vehicleId) {
    isContributor = await sessionIsActiveContributor(vehicleId, sessionUserId);
  }

  const base = {
    isOwner,
    isContributor,
    canWriteInvoices: isOwner || isContributor,
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
): Promise<VehicleAccess> {
  const session = await getCurrentUser();
  const sessionUserId = session?.id ?? null;
  const sessionEmail = session?.email ?? null;

  let vehicleId: string | null = null;
  if (isSupabaseAdminConfigured()) {
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
        canManageContributors: true,
        ownerName: displayNameFromUser(session!),
        sessionEmail,
        sessionUserId,
      };
    }

    if (owned.vehicleId) {
      const isContributor = await sessionIsActiveContributor(
        owned.vehicleId,
        sessionUserId,
      );
      if (isContributor) {
        return {
          isOwner: false,
          isContributor: true,
          canWriteInvoices: true,
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
    canManageContributors: false,
    ownerName: "Fahrer",
    sessionEmail,
    sessionUserId,
  };
}
