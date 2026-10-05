import { getCurrentUser } from "@/lib/auth/get-user";
import { mapGarageRpcError } from "@/lib/onboarding/digital-garage-beta";
import { parseHardwareRpcResult } from "@/lib/hardware/rpc-result";
import type { PendingGarageVehicle } from "@/lib/hardware/pending-garage-vehicle";
import { logServerError } from "@/lib/security/public-error";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { applyClaimTechSpecsToVehicle } from "@/lib/tags/apply-claim-tech-specs";

export async function completeGarageVehicleForOwner(
  ownerUserId: string,
  payload: PendingGarageVehicle,
): Promise<
  | { status: "created"; vehicleId: string }
  | { status: "error"; message: string }
> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return {
      status: "error",
      message: "Supabase ist nicht konfiguriert.",
    };
  }

  const user = await getCurrentUser();
  if (!user || user.id !== ownerUserId) {
    return {
      status: "error",
      message: "Bitte anmelden, um dein Fahrzeug anzulegen.",
    };
  }

  const supabase = await createClient();

  const { data: existingVehicle } = await supabase
    .from("vehicles")
    .select("id")
    .eq("user_id", ownerUserId)
    .eq("make", payload.make.trim())
    .eq("model", payload.model.trim())
    .eq("year", payload.year)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingVehicle?.id) {
    const displayName = payload.name?.trim();
    if (displayName) {
      await supabase.auth.updateUser({ data: { name: displayName } });
    }
    await applyClaimTechSpecsToVehicle(existingVehicle.id, payload.techSpecs);
    return { status: "created", vehicleId: existingVehicle.id };
  }

  const { data, error } = await supabase.rpc("create_garage_vehicle", {
    p_make: payload.make.trim(),
    p_model: payload.model.trim(),
    p_year: payload.year,
    p_vin: payload.vin?.trim() || undefined,
  });

  if (error) {
    logServerError("[garage] create_garage_vehicle failed", error);
    return {
      status: "error",
      message: "Fahrzeug konnte nicht angelegt werden.",
    };
  }

  const parsed = parseHardwareRpcResult(data);
  if (!parsed.ok || !parsed.vehicleId) {
    const mapped = mapGarageRpcError(parsed.ok ? "unavailable" : parsed.error);
    return {
      status: "error",
      message: mapped ?? "Fahrzeug konnte nicht angelegt werden.",
    };
  }

  const displayName = payload.name?.trim();
  if (displayName) {
    await supabase.auth.updateUser({ data: { name: displayName } });
  }

  await applyClaimTechSpecsToVehicle(parsed.vehicleId, payload.techSpecs);

  return { status: "created", vehicleId: parsed.vehicleId };
}
