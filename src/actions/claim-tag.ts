"use server";

import { ensureClaimAccount } from "@/lib/auth/ensure-claim-account";
import { getCurrentUser } from "@/lib/auth/get-user";
import { completeClaimForOwner } from "@/lib/tags/complete-claim-for-owner";
import { completePendingClaimForUser } from "@/lib/tags/complete-pending-claim";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";
import {
  setPendingClaim,
  type PendingClaim,
} from "@/lib/tags/pending-claim";
import { getSupabaseEnv } from "@/lib/supabase/env";

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
  | { status: "confirm_email"; message: string }
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

function dashboardAfterClaimHref(tagUuid: string, startTour: boolean): string {
  return startTour ? `/v/${tagUuid}?tour=1` : `/v/${tagUuid}`;
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
      href: dashboardAfterClaimHref(MOCK_TAG_UUIDS.active, true),
      nextTagUuid: null,
    };
  }

  let ownerUserId: string;
  let startTour = false;
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
      if (account.needsEmailConfirmation) {
        await setPendingClaim({
          tagUuid: normalized.tagUuid,
          make: normalized.make,
          model: normalized.model,
          year: normalized.year,
          vin: normalized.vin,
          email: normalized.email,
          name: normalized.name,
        });
        return {
          status: "confirm_email",
          message: account.message,
        };
      }
      return { status: "error", message: account.message };
    }
    ownerUserId = account.userId;
    startTour = account.created;
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
      href: dashboardAfterClaimHref(result.tagUuid, startTour),
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
 * Completes a claim after auth callback when the session is available via cookies().
 */
export async function completePendingClaim(): Promise<
  | { status: "claimed"; tagUuid: string; nextTagUuid: string | null }
  | { status: "error"; message: string }
  | null
> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Sitzung nach Login nicht gefunden." };
  }
  return completePendingClaimForUser(user.id);
}
