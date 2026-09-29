import "server-only";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isPlaqueTagUuid } from "@/lib/tags/plaque-qr";

export type VehicleIdScanMisroute =
  | { kind: "not_applicable" }
  | { kind: "owner_garage"; vehicleId: string }
  /** Vehicle row exists but URL is not a tag scan target. */
  | { kind: "not_a_tag" };

async function loadVehicleOwnerId(
  vehicleId: string,
): Promise<{ userId: string } | null> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return null;

  if (isSupabaseAdminConfigured()) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("vehicles")
      .select("user_id")
      .eq("id", vehicleId)
      .maybeSingle();
    if (error || !data?.user_id) return null;
    return { userId: data.user_id };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("user_id")
    .eq("id", vehicleId)
    .maybeSingle();
  if (error || !data?.user_id) return null;
  return { userId: data.user_id };
}

/**
 * `/v/{uuid}` treats any UUID v4 as a potential tag scan. Vehicle primary keys
 * are also UUID v4 — never show the tag claim UI for an existing vehicle row.
 */
export async function resolveVehicleIdScanMisroute(
  identifier: string,
  sessionUserId: string | null,
): Promise<VehicleIdScanMisroute> {
  const id = identifier.trim();
  if (!isPlaqueTagUuid(id)) {
    return { kind: "not_applicable" };
  }

  const vehicle = await loadVehicleOwnerId(id);
  if (!vehicle) {
    return { kind: "not_applicable" };
  }

  if (sessionUserId && sessionUserId === vehicle.userId) {
    return { kind: "owner_garage", vehicleId: id };
  }

  return { kind: "not_a_tag" };
}
