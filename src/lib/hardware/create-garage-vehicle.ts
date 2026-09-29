import "server-only";

import { getCurrentUser } from "@/lib/auth/get-user";
import { logServerError } from "@/lib/security/public-error";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

import { parseHardwareRpcResult } from "./rpc-result";

export type CreateGarageVehicleInput = {
  make: string;
  model: string;
  year: number;
  vin?: string | null;
};

export async function createGarageVehicleForOwner(
  input: CreateGarageVehicleInput,
): Promise<
  | { status: "created"; vehicleId: string }
  | { status: "error"; message: string }
> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return { status: "error", message: "Supabase ist nicht konfiguriert." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      status: "error",
      message: "Bitte anmelden, um ein Fahrzeug anzulegen.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_garage_vehicle", {
    p_make: input.make.trim(),
    p_model: input.model.trim(),
    p_year: input.year,
    p_vin: input.vin?.trim() || undefined,
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
    return {
      status: "error",
      message: "Fahrzeug konnte nicht angelegt werden.",
    };
  }

  return { status: "created", vehicleId: parsed.vehicleId };
}
