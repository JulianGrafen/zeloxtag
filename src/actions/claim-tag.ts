"use server";

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

/** Feature flag: Magic Link auth is deferred — claims use service role. */
const MAGIC_LINK_ENABLED = false;

/** Fallback owner while Magic Link is off (seeded by `npm run db:seed-demo`). */
const DEMO_OWNER_EMAIL = "demo@zeloxtag.local";

export type ClaimTagInput = {
  tagUuid: string;
  make: string;
  model: string;
  year: string;
  vin?: string;
  email?: string;
  name?: string;
};

export type ClaimTagResult =
  | { status: "error"; message: string }
  | { status: "continue"; href: string; nextTagUuid: string | null };

type NormalizedClaim = PendingClaim;

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
  };
}

function dashboardScannerHref(tagUuid: string): string {
  return `/v/${tagUuid}?scan=1`;
}

async function resolveDeferredOwnerUserId(): Promise<string> {
  const admin = createAdminClient();
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) {
    throw new Error(`Owner-Lookup: ${listed.error.message}`);
  }

  const existing = listed.data.users.find(
    (user) => user.email?.toLowerCase() === DEMO_OWNER_EMAIL,
  );
  if (existing) return existing.id;

  const created = await admin.auth.admin.createUser({
    email: DEMO_OWNER_EMAIL,
    password: randomDemoPassword(),
    email_confirm: true,
    user_metadata: { name: "ZeloxTag Demo" },
  });
  if (created.error || !created.data.user) {
    throw new Error(
      `Demo-Owner: ${created.error?.message ?? "Anlage fehlgeschlagen"}`,
    );
  }
  return created.data.user.id;
}

function randomDemoPassword(): string {
  return `zt-${crypto.randomUUID()}`;
}

/**
 * Claims an unclaimed ZeloxTag, then mints a fresh unclaimed tag for the next QR.
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

  const user = await getCurrentUser();

  if (!user && MAGIC_LINK_ENABLED) {
    return {
      status: "error",
      message: "Anmeldung ist erforderlich.",
    };
  }

  if (!user && !isSupabaseAdminConfigured()) {
    return {
      status: "error",
      message:
        "SUPABASE_SERVICE_ROLE_KEY fehlt — Claim ohne Login nicht möglich.",
    };
  }

  try {
    const ownerUserId = user?.id ?? (await resolveDeferredOwnerUserId());
    const result = await completeClaimForOwner(ownerUserId, {
      ...normalized,
      email: (user?.email ?? normalized.email).toLowerCase(),
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
 * Completes a claim after Magic Link callback (kept for later re-enable).
 */
export async function completePendingClaim(): Promise<
  | { status: "claimed"; tagUuid: string; nextTagUuid: string | null }
  | { status: "error"; message: string }
  | null
> {
  if (!MAGIC_LINK_ENABLED) return null;

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
  // Prefer admin while auth is deferred / for minting the next unclaimed tag.
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
    // Claim already succeeded — surface mint failure but keep the claimed tag usable.
    console.error("Failed to mint next unclaimed tag after claim:", mintError);
  }

  return {
    status: "claimed",
    tagUuid: claim.tagUuid,
    nextTagUuid,
  };
}
