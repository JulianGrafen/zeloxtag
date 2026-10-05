"use server";

import { headers } from "next/headers";

import { checkAccountWritable } from "@/lib/account/account-lifecycle";
import { ensureClaimAccount } from "@/lib/auth/ensure-claim-account";
import { getCurrentUser } from "@/lib/auth/get-user";
import { completeGarageVehicleForOwner } from "@/lib/hardware/complete-garage-vehicle-for-owner";
import {
  clearPendingGarageVehicleState,
  setPendingGarageVehicle,
} from "@/lib/hardware/pending-garage-vehicle";
import {
  DIGITAL_GARAGE_BETA_FULL_MESSAGE,
  getDigitalGarageBetaStatus,
  isDigitalGarageBetaClosed,
} from "@/lib/onboarding/digital-garage-beta";
import { garageDashboardTourHref } from "@/lib/onboarding/dashboard-tour";
import { setPendingDashboardTour } from "@/lib/onboarding/pending-dashboard-tour";
import {
  authClientKeyFromHeaders,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";
import {
  logServerError,
  publicClientMessage,
} from "@/lib/security/public-error";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeClaimTechSpecs,
  type ClaimTechSpecsInput,
} from "@/lib/tags/claim-tech-specs";
import type { PendingGarageVehicle } from "@/lib/hardware/pending-garage-vehicle";

export type CreateDigitalGarageVehicleInput = {
  make: string;
  model: string;
  year: string;
  vin?: string;
  techSpecs?: ClaimTechSpecsInput;
  email?: string;
  password?: string;
  name?: string;
};

export type CreateDigitalGarageVehicleResult =
  | { status: "error"; message: string }
  | { status: "confirm_email"; message: string }
  | { status: "continue"; href: string; vehicleId: string };

type NormalizedGarageSetup = PendingGarageVehicle & {
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

function normalizeGarageInput(
  input: CreateDigitalGarageVehicleInput,
): NormalizedGarageSetup {
  const make = input.make.trim();
  const model = input.model.trim();
  const year = Number.parseInt(input.year, 10);
  const email = (input.email ?? "").trim().toLowerCase();
  const name = input.name?.trim() || null;
  const password = input.password?.trim() || null;

  if (!make) throw new Error("Marke ist erforderlich.");
  if (!model) throw new Error("Modell ist erforderlich.");
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    throw new Error("Baujahr muss zwischen 1900 und 2100 liegen.");
  }

  return {
    make,
    model,
    year,
    vin: normalizeVin(input.vin),
    email,
    name,
    password,
    techSpecs: normalizeClaimTechSpecs(input.techSpecs),
  };
}

async function countOwnerVehicles(userId: string): Promise<number> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Digital garage onboarding — same wizard as tag claim, without a physical tag.
 */
export async function createDigitalGarageVehicle(
  input: CreateDigitalGarageVehicleInput,
): Promise<CreateDigitalGarageVehicleResult> {
  let normalized: NormalizedGarageSetup;
  try {
    normalized = normalizeGarageInput(input);
  } catch (error) {
    return {
      status: "error",
      message: publicClientMessage(error, "Ungültige Eingabe."),
    };
  }

  try {
    const headerStore = await headers();
    const clientKey = authClientKeyFromHeaders(headerStore);
    const limited = await rateLimit({
      key: `auth:garage-setup:${clientKey}`,
      limit: RATE_LIMITS.auth.limit,
      windowMs: RATE_LIMITS.auth.windowMs,
    });
    if (!limited.ok) {
      return {
        status: "error",
        message: `Zu viele Versuche. Bitte in ${limited.retryAfterSec}s erneut versuchen.`,
      };
    }
  } catch (error) {
    console.error("[garage-setup] rate limit skipped", error);
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return {
      status: "continue",
      href: garageDashboardTourHref("mock-vehicle"),
      vehicleId: "mock-vehicle",
    };
  }

  const betaStatus = await getDigitalGarageBetaStatus();
  if (isDigitalGarageBetaClosed(betaStatus)) {
    return { status: "error", message: DIGITAL_GARAGE_BETA_FULL_MESSAGE };
  }

  let ownerUserId: string;
  let startTour = false;
  const currentUser = await getCurrentUser();

  if (currentUser) {
    const writable = await checkAccountWritable(currentUser.id);
    if (!writable.ok) {
      return { status: "error", message: writable.message };
    }
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
      redirectNext: "/auth/continue",
    });

    if (!account.ok) {
      if (account.needsEmailConfirmation) {
        await setPendingGarageVehicle(
          {
            make: normalized.make,
            model: normalized.model,
            year: normalized.year,
            vin: normalized.vin,
            email: normalized.email,
            name: normalized.name,
            techSpecs: normalized.techSpecs,
          },
          { userId: account.pendingUserId },
        );
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

  let runDashboardOnboarding = startTour;
  if (currentUser && !runDashboardOnboarding) {
    const ownedBefore = await countOwnerVehicles(ownerUserId);
    runDashboardOnboarding = ownedBefore === 0;
  }

  try {
    const result = await completeGarageVehicleForOwner(ownerUserId, {
      make: normalized.make,
      model: normalized.model,
      year: normalized.year,
      vin: normalized.vin,
      email: (currentUser?.email ?? normalized.email).toLowerCase(),
      name: normalized.name,
      techSpecs: normalized.techSpecs,
    });

    if (result.status === "error") {
      return result;
    }

    await clearPendingGarageVehicleState(ownerUserId);

    if (runDashboardOnboarding) {
      await setPendingDashboardTour();
    }

    return {
      status: "continue",
      href: garageDashboardTourHref(
        result.vehicleId,
        runDashboardOnboarding,
      ),
      vehicleId: result.vehicleId,
    };
  } catch (error) {
    logServerError("[create-digital-garage-vehicle] unexpected", error);
    return {
      status: "error",
      message: "Fahrzeug konnte nicht angelegt werden.",
    };
  }
}
