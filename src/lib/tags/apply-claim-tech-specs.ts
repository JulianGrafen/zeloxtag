import { logServerError } from "@/lib/security/public-error";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  mergeClaimTechSpecs,
  type ClaimTechSpecs,
} from "@/lib/tags/claim-tech-specs";
import {
  parseVehicleTechSpecs,
  serializeVehicleTechSpecs,
} from "@/lib/vehicles/tech-specs";

export async function applyClaimTechSpecsToVehicle(
  vehicleId: string,
  specs: ClaimTechSpecs | null | undefined,
): Promise<void> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured || !specs) return;

  const merged = mergeClaimTechSpecs(specs);
  const serialized = serializeVehicleTechSpecs(merged);
  if (Object.keys(serialized).length === 0) return;

  const supabase = await createClient();

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("tech_specs")
    .eq("id", vehicleId)
    .maybeSingle();

  if (vehicleError) {
    logServerError("[claim] tech specs vehicle lookup failed", vehicleError);
    return;
  }

  const existing = parseVehicleTechSpecs(vehicle?.tech_specs);
  const next = serializeVehicleTechSpecs({ ...existing, ...merged });

  const { error: updateError } = await supabase
    .from("vehicles")
    .update({ tech_specs: next })
    .eq("id", vehicleId);

  if (updateError) {
    logServerError("[claim] tech specs update failed", updateError);
  }
}

export async function applyClaimTechSpecs(
  tagUuid: string,
  specs: ClaimTechSpecs | null | undefined,
): Promise<void> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured || !specs) return;

  const supabase = await createClient();
  const { data: tag, error: tagError } = await supabase
    .from("tags")
    .select("vehicle_id")
    .eq("uuid", tagUuid)
    .maybeSingle();

  if (tagError || !tag?.vehicle_id) {
    if (tagError) {
      logServerError("[claim] tech specs tag lookup failed", tagError);
    }
    return;
  }

  await applyClaimTechSpecsToVehicle(tag.vehicle_id, specs);
}
