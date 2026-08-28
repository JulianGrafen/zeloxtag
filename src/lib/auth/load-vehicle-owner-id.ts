import "server-only";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

/**
 * Owner auth subject for document rows — server-only, never callable from the
 * browser as a redacted RPC (Schrauber must not learn owner user_id via JWT).
 */
export async function loadVehicleOwnerUserId(
  vehicleId: string,
): Promise<string | null> {
  if (!vehicleId.trim() || !isSupabaseAdminConfigured()) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicles")
    .select("user_id")
    .eq("id", vehicleId.trim())
    .maybeSingle();

  if (error) {
    console.error("[load-vehicle-owner-id] lookup failed", error.message);
    return null;
  }

  return typeof data?.user_id === "string" ? data.user_id : null;
}
