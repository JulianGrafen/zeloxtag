"use server";

import { ensureClaimAccount } from "@/lib/auth/ensure-claim-account";
import { getCurrentUser } from "@/lib/auth/get-user";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { createUnclaimedTag } from "@/lib/tags/create-unclaimed-tag";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";
import {
  clearPendingClaim,
  getPendingClaim,
  type PendingClaim,
} from "@/lib/tags/pending-claim";

export type ClaimTagInput = {
  tagUuid: string;
  make: string;
  model: string;
  year: string;
  vin?: string;
  /** Required on first claim when not already signed in. */
  email?: string;
  password?: string;
  name?: string;
};

export type ClaimTagResult =
  | { status: "error"; message: string }
  | { status: "continue"; href: string; nextTagUuid: string | null };

type NormalizedClaim = PendingClaim & {
  password: string | null;
};

function normalizeVin(raw: string | undefined): string | null {
  const vin = raw?.trim().toUpperCase() ?? "";
  if (!vin) return null;
  if (vin.length < 5 || vin.length > 32) {
    throw new Error("VIN muss zwischen 5 und 32 Zeichen liegen.");
  }
  return vin;
}

function normalizeClaimInput(input: ClaimTagInput): NormalizedClaim {
  const tagUuid = input.tagUuid.trim();
  const make = input.make.trim();
  const model = input.model.trim();
  const year = Number.parseInt(input.year, 10);
  const email = (input.email ?? "").trim().toLowerCase();
  const name = input.name?.trim() || null;
  const password = input.password?.trim() || null;

  if (!tagUuid) throw new Error("Tag-UUID fehlt.");
  if (!make) throw new Error("Marke ist erforderlich.");
  if (!model) throw new Error("Modell ist erforderlich.");
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    throw new Error("Baujahr muss zwischen 1900 und 2100 liegen.");
  }

  return {
    tagUuid,
    make,
    model,
    year,
    vin: normalizeVin(input.vin),
    email,
    name,
    password,
  };
}

function dashboardScannerHref(tagUuid: string): string {
  return `/v/${tagUuid}?scan=1`;
}

/**
 * Claims an unclaimed ZeloxTag for a real user account, then mints the next tag.
 * First-time scanners create an account (email + password) as part of the claim.
 */
export async function claimTag(input: ClaimTagInput): Promise<ClaimTagResult> {
  let normalized: NormalizedClaim;
  try {
    normalized = normalizeClaimInput(input);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Ungültige Eingabe.",
    };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    if (normalized.tagUuid !== MOCK_TAG_UUIDS.unclaimed) {
      return {
        status: "error",
        message: "Mock-Modus: nur demo-unclaimed-tag kann beansprucht werden.",
      };
    }
    return {
      status: "continue",
      href: dashboardScannerHref(MOCK_TAG_UUIDS.active),
      nextTagUuid: null,
    };
  }

  let ownerUserId: string;
  const currentUser = await getCurrentUser();

  if (currentUser) {
    ownerUserId = currentUser.id;
  } else {
    if (!normalized.email || !normalized.password) {
      return {
        status: "error",
        message: "E-Mail und Passwort sind für die Kontoanlage erforderlich.",
      };
    }

    const account = await ensureClaimAccount({
      email: normalized.email,
      password: normalized.password,
      name: normalized.name,
    });

    if (!account.ok) {
      return { status: "error", message: account.message };
    }
    ownerUserId = account.userId;
  }

  try {
    const result = await completeClaimForOwner(ownerUserId, {
      tagUuid: normalized.tagUuid,
      make: normalized.make,
      model: normalized.model,
      year: normalized.year,
      vin: normalized.vin,
      email: (currentUser?.email ?? normalized.email).toLowerCase(),
      name: normalized.name,
    });

    if (result.status === "error") {
      return result;
    }

    return {
      status: "continue",
      href: dashboardScannerHref(result.tagUuid),
      nextTagUuid: result.nextTagUuid,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Claim fehlgeschlagen.",
    };
  }
}

/**
 * Completes a claim after Magic Link callback (optional path).
 */
export async function completePendingClaim(): Promise<
  | { status: "claimed"; tagUuid: string; nextTagUuid: string | null }
  | { status: "error"; message: string }
  | null
> {
  const pending = await getPendingClaim();
  if (!pending) return null;

  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Sitzung nach Login nicht gefunden." };
  }

  const result = await completeClaimForOwner(user.id, pending);
  await clearPendingClaim();
  return result;
}

async function completeClaimForOwner(
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
  if (claim.name && user && !user.user_metadata?.name) {
    const authed = await createClient();
    await authed.auth.updateUser({ data: { name: claim.name } });
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

  const { error: linkError } = await supabase
    .from("tags")
    .update({
      status: "active",
      vehicle_id: vehicle.id,
    })
    .eq("id", tag.id)
    .eq("status", "unclaimed");

  if (linkError) {
    await supabase.from("vehicles").delete().eq("id", vehicle.id);
    return { status: "error", message: `Verknüpfung: ${linkError.message}` };
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
