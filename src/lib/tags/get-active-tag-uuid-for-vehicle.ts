import "server-only";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the active physical tag UUID linked to a vehicle, if any.
 */
export async function getActiveTagUuidForVehicle(
  vehicleId: string,
): Promise<string | null> {
  const normalized = vehicleId.trim();
  if (!normalized) return null;

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return null;

  if (isSupabaseAdminConfigured()) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("tags")
      .select("uuid")
      .eq("vehicle_id", normalized)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to resolve tag for vehicle: ${error.message}`);
    }

    return typeof data?.uuid === "string" ? data.uuid : null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("uuid")
    .eq("vehicle_id", normalized)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve tag for vehicle: ${error.message}`);
  }

  return typeof data?.uuid === "string" ? data.uuid : null;
}
