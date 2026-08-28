import { getCurrentUser } from "@/lib/auth/get-user";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createUnclaimedTag } from "@/lib/tags/create-unclaimed-tag";
import type { PendingClaim } from "@/lib/tags/pending-claim";

export async function completeClaimForOwner(
  ownerUserId: string,
  claim: PendingClaim,
): Promise<
  | { status: "claimed"; tagUuid: string; nextTagUuid: string | null }
  | { status: "error"; message: string }
> {
  if (!isSupabaseAdminConfigured()) {
    return {
      status: "error",
      message: "SUPABASE_SERVICE_ROLE_KEY fehlt für Claim + Tag-Minting.",
    };
  }
  const supabase = createAdminClient();

  const user = await getCurrentUser();
  const authed = await createClient();
  if (user) {
    const meta: Record<string, string> = {
      active_tag_uuid: claim.tagUuid,
    };
    if (claim.name && !user.user_metadata?.name) {
      meta.name = claim.name;
    }
    await authed.auth.updateUser({ data: meta });
  }

  const { data: tag, error: tagError } = await supabase
    .from("tags")
    .select("*")
    .eq("uuid", claim.tagUuid)
    .maybeSingle();

  if (tagError) {
    return { status: "error", message: `Tag: ${tagError.message}` };
  }
  if (!tag) {
    return { status: "error", message: "Tag nicht gefunden." };
  }
  if (tag.status !== "unclaimed" || tag.vehicle_id) {
    return { status: "error", message: "Dieser Tag ist bereits verknüpft." };
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .insert({
      user_id: ownerUserId,
      make: claim.make,
      model: claim.model,
      year: claim.year,
      vin: claim.vin,
    })
    .select("*")
    .single();

  if (vehicleError || !vehicle) {
    return {
      status: "error",
      message: `Fahrzeug: ${vehicleError?.message ?? "Anlage fehlgeschlagen"}`,
    };
  }

  const { data: linkedTag, error: linkError } = await supabase
    .from("tags")
    .update({
      status: "active",
      vehicle_id: vehicle.id,
    })
    .eq("id", tag.id)
    .eq("status", "unclaimed")
    .is("vehicle_id", null)
    .select("id")
    .maybeSingle();

  if (linkError || !linkedTag) {
    await supabase.from("vehicles").delete().eq("id", vehicle.id);
    return {
      status: "error",
      message: linkError
        ? `Verknüpfung: ${linkError.message}`
        : "Dieser Tag wurde gerade von jemand anderem beansprucht.",
    };
  }

  let nextTagUuid: string | null = null;
  try {
    const nextTag = await createUnclaimedTag();
    nextTagUuid = nextTag.uuid;
  } catch (mintError) {
    console.error("Failed to mint next unclaimed tag after claim:", mintError);
  }

  return {
    status: "claimed",
    tagUuid: claim.tagUuid,
    nextTagUuid,
  };
}
