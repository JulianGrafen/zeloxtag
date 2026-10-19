import "server-only";

import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  garagePathForVehicle,
  vehicleSurfaceHref,
} from "@/lib/vehicle-surface/paths";

export async function resolveWeeklyRankEntdeckenHref(
  vehicleId: string,
): Promise<string> {
  const trimmed = vehicleId.trim();
  if (!trimmed) return "/";

  if (!isSupabaseAdminConfigured()) {
    return garagePathForVehicle(trimmed, "entdecken");
  }

  const admin = createAdminClient();
  const { data: tag } = await admin
    .from("tags")
    .select("uuid")
    .eq("vehicle_id", trimmed)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tag?.uuid) {
    return vehicleSurfaceHref(
      { vehicleId: trimmed, linkedTagUuid: tag.uuid },
      "entdecken",
    );
  }

  return garagePathForVehicle(trimmed, "entdecken");
}
