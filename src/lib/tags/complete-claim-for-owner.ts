import { getCurrentUser } from "@/lib/auth/get-user";
import { logServerError } from "@/lib/security/public-error";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { CLAIM_UNAVAILABLE_MESSAGE } from "@/lib/tags/claim-landing";
import { applyClaimTechSpecs } from "@/lib/tags/apply-claim-tech-specs";
import type { PendingClaim } from "@/lib/tags/pending-claim";
import type { Json } from "@/types/database";

function isClaimRpcMissing(error: { message?: string; code?: string }): boolean {
  const message = error.message ?? "";
  return (
    error.code === "PGRST202" ||
    /claim_unclaimed_tag.*schema cache/i.test(message) ||
    /Could not find the function public\.claim_unclaimed_tag/i.test(message)
  );
}

function claimRpcArgs(claim: PendingClaim) {
  const args: {
    p_uuid: string;
    p_make: string;
    p_model: string;
    p_year: number;
    p_vin?: string;
  } = {
    p_uuid: claim.tagUuid,
    p_make: claim.make,
    p_model: claim.model,
    p_year: claim.year,
  };
  if (claim.vin) {
    args.p_vin = claim.vin;
  }
  return args;
}

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
  const { data, error } = await supabase.rpc(
    "claim_unclaimed_tag",
    claimRpcArgs(claim),
  );

  if (error || !claimRpcSucceeded(data)) {
    if (error) {
      if (isClaimRpcMissing(error)) {
        logServerError(
          "[claim] claim_unclaimed_tag missing on database — apply migration 00049 or 00051 and reload PostgREST schema",
          error,
        );
      } else {
        logServerError("[claim] rpc failed", error);
      }
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

  await applyClaimTechSpecs(claim.tagUuid, claim.techSpecs);

  return {
    status: "claimed",
    tagUuid: claim.tagUuid,
    nextTagUuid: null,
  };
}
