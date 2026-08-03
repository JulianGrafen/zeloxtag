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

/**
 * Resolves owner vs guest access for a claimed vehicle / QR digital twin.
 */
export async function getVehicleAccess(
  vehicleUserId: string,
): Promise<VehicleAccess> {
  const session = await getCurrentUser();
  const sessionUserId = session?.id ?? null;
  const sessionEmail = session?.email ?? null;
  const isOwner = Boolean(sessionUserId && sessionUserId === vehicleUserId);

  let ownerName = "Fahrer";

  if (isOwner && session) {
    if (typeof session.user_metadata?.name === "string" && session.user_metadata.name.trim()) {
      ownerName = session.user_metadata.name.trim();
    } else if (session.email) {
      ownerName = session.email.split("@")[0] || "Fahrer";
    }
    return { isOwner, ownerName, sessionEmail, sessionUserId };
  }

  const { isConfigured } = getSupabaseEnv();
  if (isConfigured && isSupabaseAdminConfigured()) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.getUserById(vehicleUserId);
      if (!error && data.user) {
        const metaName = data.user.user_metadata?.name;
        if (typeof metaName === "string" && metaName.trim()) {
          ownerName = metaName.trim();
        } else if (data.user.email) {
          ownerName = data.user.email.split("@")[0] || "Fahrer";
        }
      }
    } catch {
      // Keep fallback label.
    }
  }

  return { isOwner, ownerName, sessionEmail, sessionUserId };
}
