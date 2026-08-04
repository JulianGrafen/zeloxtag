import { getCurrentUser } from "@/lib/auth/get-user";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type VehicleAccess = {
  /** Session user owns this vehicle. */
  isOwner: boolean;
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

/**
 * Resolves owner vs guest access for a claimed vehicle / QR digital twin.
 */
export async function getVehicleAccess(
  vehicleUserId: string,
): Promise<VehicleAccess> {
  const session = await getCurrentUser();
  const sessionUserId = session?.id ?? null;
  const sessionEmail = session?.email ?? null;
  const isOwner = Boolean(
    sessionUserId && vehicleUserId && sessionUserId === vehicleUserId,
  );

  let ownerName = "Fahrer";

  if (isOwner && session) {
    return {
      isOwner,
      ownerName: displayNameFromUser(session),
      sessionEmail,
      sessionUserId,
    };
  }

  if (!vehicleUserId) {
    return { isOwner: false, ownerName, sessionEmail, sessionUserId };
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

  return { isOwner, ownerName, sessionEmail, sessionUserId };
}

/**
 * Ownership check that still works when the public RPC stripped `user_id`.
 */
export async function sessionOwnsTagVehicle(
  tagUuid: string,
  sessionUserId: string,
): Promise<boolean> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured || !isSupabaseAdminConfigured()) {
    return false;
  }

  const admin = createAdminClient();
  const { data: tag } = await admin
    .from("tags")
    .select("vehicle_id, status")
    .eq("uuid", tagUuid)
    .maybeSingle();

  if (!tag?.vehicle_id || tag.status !== "active") {
    return false;
  }

  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id")
    .eq("id", tag.vehicle_id)
    .eq("user_id", sessionUserId)
    .maybeSingle();

  return Boolean(vehicle);
}

/**
 * Access helper for tag pages — uses vehicle.user_id when present, otherwise
 * probes ownership via service role (public twin RPC redacts owner id).
 */
export async function getTagVehicleAccess(
  tagUuid: string,
  vehicleUserId: string | null | undefined,
): Promise<VehicleAccess> {
  if (vehicleUserId) {
    return getVehicleAccess(vehicleUserId);
  }

  const session = await getCurrentUser();
  const sessionUserId = session?.id ?? null;
  const sessionEmail = session?.email ?? null;

  if (sessionUserId && (await sessionOwnsTagVehicle(tagUuid, sessionUserId))) {
    return {
      isOwner: true,
      ownerName: displayNameFromUser(session!),
      sessionEmail,
      sessionUserId,
    };
  }

  return {
    isOwner: false,
    ownerName: "Fahrer",
    sessionEmail,
    sessionUserId,
  };
}
