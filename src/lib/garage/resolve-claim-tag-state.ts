import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

export type ClaimTagState =
  | { kind: "unclaimed" }
  | { kind: "owned_by"; tagUuid: string; vehicleId: string }
  | { kind: "unavailable" };

export async function resolveClaimTagState(
  tagUuid: string,
  sessionUserId: string | null,
): Promise<ClaimTagState> {
  const trimmed = tagUuid.trim();
  if (!trimmed) return { kind: "unavailable" };

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    if (trimmed === MOCK_TAG_UUIDS.unclaimed) {
      return { kind: "unclaimed" };
    }
    return { kind: "unavailable" };
  }

  if (!isSupabaseAdminConfigured()) {
    return { kind: "unavailable" };
  }

  const admin = createAdminClient();
  const { data: tag, error } = await admin
    .from("tags")
    .select("uuid, status, vehicle_id")
    .eq("uuid", trimmed)
    .maybeSingle();

  if (error || !tag) {
    return { kind: "unavailable" };
  }

  if (tag.status === "unclaimed" && !tag.vehicle_id) {
    return { kind: "unclaimed" };
  }

  if (tag.status === "active" && tag.vehicle_id && sessionUserId) {
    const { data: vehicle } = await admin
      .from("vehicles")
      .select("id, user_id")
      .eq("id", tag.vehicle_id)
      .maybeSingle();

    if (vehicle?.user_id === sessionUserId) {
      return {
        kind: "owned_by",
        tagUuid: tag.uuid,
        vehicleId: vehicle.id,
      };
    }
  }

  return { kind: "unavailable" };
}
