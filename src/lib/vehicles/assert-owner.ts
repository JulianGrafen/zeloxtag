import { getCurrentUser } from "@/lib/auth/get-user";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type OwnerCheckResult =
  | { ok: true; userId: string; vehicleId: string }
  | { ok: false; reason: "unconfigured" | "unauthorized" | "forbidden" | "not_found"; message: string };

/**
 * Ensures the current session owns the given vehicle.
 * In local mock mode (no Supabase), ownership checks are skipped by callers.
 */
export async function assertVehicleOwner(
  vehicleId: string,
): Promise<OwnerCheckResult> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return {
      ok: false,
      reason: "unconfigured",
      message: "Supabase is not configured.",
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      reason: "unauthorized",
      message: "Authentication required.",
    };
  }

  const supabase = await createClient();
  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .select("id, user_id")
    .eq("id", vehicleId)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "not_found", message: error.message };
  }
  if (!vehicle) {
    return { ok: false, reason: "not_found", message: "Vehicle not found." };
  }
  if (vehicle.user_id !== user.id) {
    return {
      ok: false,
      reason: "forbidden",
      message: "Only the vehicle owner can perform this action.",
    };
  }

  return { ok: true, userId: user.id, vehicleId: vehicle.id };
}
