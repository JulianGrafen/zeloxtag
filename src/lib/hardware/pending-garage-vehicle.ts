import { cookies } from "next/headers";

import { setPendingDashboardTour } from "@/lib/onboarding/pending-dashboard-tour";
import type { ClaimTechSpecs } from "@/lib/tags/claim-tech-specs";

export const PENDING_GARAGE_VEHICLE_COOKIE = "zt_pending_garage_vehicle";

/** Vehicle payload stored while deferred auth completes (digital garage signup). */
export type PendingGarageVehicle = {
  make: string;
  model: string;
  year: number;
  vin: string | null;
  email: string;
  name: string | null;
  techSpecs?: ClaimTechSpecs | null;
};

const MAX_AGE_SECONDS = 60 * 60;

function isClaimTechSpecs(value: unknown): value is ClaimTechSpecs {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const powerPs = record.powerPs;
  const displacementCc = record.displacementCc;
  const drivetrain = record.drivetrain;
  const fuelType = record.fuelType;

  if (
    !(powerPs === null || (typeof powerPs === "number" && Number.isFinite(powerPs)))
  ) {
    return false;
  }
  if (
    !(
      displacementCc === null ||
      (typeof displacementCc === "number" && Number.isFinite(displacementCc))
    )
  ) {
    return false;
  }
  if (!(drivetrain === null || typeof drivetrain === "string")) return false;
  if (!(fuelType === null || typeof fuelType === "string")) return false;
  const oilChangeIntervalKm = record.oilChangeIntervalKm;
  const oilChangeIntervalMonths = record.oilChangeIntervalMonths;
  if (
    !(
      oilChangeIntervalKm === null ||
      (typeof oilChangeIntervalKm === "number" && Number.isFinite(oilChangeIntervalKm))
    )
  ) {
    return false;
  }
  if (
    !(
      oilChangeIntervalMonths === null ||
      (typeof oilChangeIntervalMonths === "number" &&
        Number.isFinite(oilChangeIntervalMonths))
    )
  ) {
    return false;
  }
  const buildPersonalityTags = record.buildPersonalityTags;
  if (buildPersonalityTags != null) {
    if (!Array.isArray(buildPersonalityTags)) return false;
    if (!buildPersonalityTags.every((entry) => typeof entry === "string")) {
      return false;
    }
  }
  return true;
}

export async function setPendingGarageVehicle(
  payload: PendingGarageVehicle,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_GARAGE_VEHICLE_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  await setPendingDashboardTour();
}

export async function getPendingGarageVehicle(): Promise<PendingGarageVehicle | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_GARAGE_VEHICLE_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingGarageVehicle;
    if (
      typeof parsed.make !== "string" ||
      typeof parsed.model !== "string" ||
      typeof parsed.year !== "number" ||
      typeof parsed.email !== "string" ||
      !(parsed.vin === null || typeof parsed.vin === "string") ||
      !(parsed.name === null || typeof parsed.name === "string")
    ) {
      return null;
    }
    if (
      parsed.techSpecs != null &&
      parsed.techSpecs !== undefined &&
      !isClaimTechSpecs(parsed.techSpecs)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearPendingGarageVehicle(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_GARAGE_VEHICLE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
