import { getCurrentUser } from "@/lib/auth/get-user";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { CLAIM_UNAVAILABLE_MESSAGE } from "@/lib/tags/claim-landing";
import type { PendingClaim } from "@/lib/tags/pending-claim";
import type { Json } from "@/types/database";

function claimRpcSucceeded(data: Json | null): boolean {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }
  return data.ok === true;
}

export async function completeClaimForOwner(
  ownerUserId: string,
  claim: PendingClaim,
): Promise<
  | { status: "claimed"; tagUuid: string; nextTagUuid: string | null }
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
      message: "Bitte anmelden, um den Tag zu beanspruchen.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_unclaimed_tag", {
    p_uuid: claim.tagUuid,
    p_make: claim.make,
    p_model: claim.model,
    p_year: claim.year,
    p_vin: claim.vin,
  });

  if (error || !claimRpcSucceeded(data)) {
    if (error) {
      console.error("[claim] rpc failed", error.message);
    }
    return { status: "error", message: CLAIM_UNAVAILABLE_MESSAGE };
  }

  const meta: Record<string, string> = {
    active_tag_uuid: claim.tagUuid,
  };
  if (claim.name && !user.user_metadata?.name) {
    meta.name = claim.name;
  }
  await supabase.auth.updateUser({ data: meta });

  return {
    status: "claimed",
    tagUuid: claim.tagUuid,
    nextTagUuid: null,
  };
}
