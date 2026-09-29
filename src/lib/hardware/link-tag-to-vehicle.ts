import "server-only";

import { getCurrentUser } from "@/lib/auth/get-user";
import { CLAIM_UNAVAILABLE_MESSAGE } from "@/lib/tags/claim-landing";
import { isPlaqueTagUuid } from "@/lib/tags/plaque-qr";
import { logServerError } from "@/lib/security/public-error";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

import { parseHardwareRpcResult } from "./rpc-result";

export async function linkTagToVehicleForOwner(input: {
  tagUuid: string;
  vehicleId: string;
}): Promise<
  | { status: "linked"; tagUuid: string; vehicleId: string }
  | { status: "error"; message: string }
> {
  const tagUuid = input.tagUuid.trim();
  const vehicleId = input.vehicleId.trim();

  if (!isPlaqueTagUuid(tagUuid)) {
    return {
      status: "error",
      message: "Ungültige Tag-ID. Bitte die UUID von der Plaque eingeben.",
    };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return { status: "error", message: "Supabase ist nicht konfiguriert." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      status: "error",
      message: "Bitte anmelden, um einen Tag zu verknüpfen.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("link_unclaimed_tag_to_vehicle", {
    p_tag_uuid: tagUuid,
    p_vehicle_id: vehicleId,
  });

  if (error) {
    logServerError("[hardware] link_unclaimed_tag_to_vehicle failed", error);
    return { status: "error", message: CLAIM_UNAVAILABLE_MESSAGE };
  }

  const parsed = parseHardwareRpcResult(data);
  if (!parsed.ok) {
    if (parsed.error === "vehicle_already_linked") {
      return {
        status: "error",
        message: "Dieses Fahrzeug hat bereits einen aktiven Tag.",
      };
    }
    return { status: "error", message: CLAIM_UNAVAILABLE_MESSAGE };
  }

  const linkedTag = parsed.tagUuid ?? tagUuid;
  return {
    status: "linked",
    tagUuid: linkedTag,
    vehicleId: parsed.vehicleId ?? vehicleId,
  };
}
