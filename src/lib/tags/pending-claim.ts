import { cookies } from "next/headers";

import {
  clearPendingClaimForUser,
  loadPendingClaimForUser,
  savePendingClaimForUser,
} from "@/lib/auth/pending-signup-user-metadata";
import { setPendingDashboardTour } from "@/lib/onboarding/pending-dashboard-tour";
import type { ClaimTechSpecs } from "@/lib/tags/claim-tech-specs";

export const PENDING_CLAIM_COOKIE = "zt_pending_claim";

/** Vehicle + tag payload stored while deferred auth completes. */
export type PendingClaim = {
  tagUuid: string;
  make: string;
  model: string;
  year: number;
  vin: string | null;
  email: string;
  name: string | null;
  techSpecs?: ClaimTechSpecs | null;
};

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function isClaimTechSpecs(value: unknown): value is ClaimTechSpecs {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const numericOrNull = (key: string) => {
    const value = record[key];
    return (
      value === null ||
      value === undefined ||
      (typeof value === "number" && Number.isFinite(value))
    );
  };

  if (
    !numericOrNull("powerPs") ||
    !numericOrNull("torqueNm") ||
    !numericOrNull("displacementCc") ||
    !numericOrNull("accel0To100Sec") ||
    !numericOrNull("accel100To200Sec")
  ) {
    return false;
  }

  const drivetrain = record.drivetrain;
  const fuelType = record.fuelType;
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
    if (
      !buildPersonalityTags.every((entry) => typeof entry === "string")
    ) {
      return false;
    }
  }
  return true;
}

export async function setPendingClaim(
  claim: PendingClaim,
  options?: { userId?: string },
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_CLAIM_COOKIE, JSON.stringify(claim), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  if (options?.userId) {
    await savePendingClaimForUser(options.userId, claim);
  }
  await setPendingDashboardTour();
}

export async function resolvePendingClaim(
  userId: string,
): Promise<PendingClaim | null> {
  const fromCookie = await getPendingClaim();
  if (fromCookie) return fromCookie;
  return loadPendingClaimForUser(userId);
}

export async function clearPendingClaimState(userId: string): Promise<void> {
  await clearPendingClaim();
  await clearPendingClaimForUser(userId);
}

export async function getPendingClaim(): Promise<PendingClaim | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_CLAIM_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingClaim;
    if (
      typeof parsed.tagUuid !== "string" ||
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

export async function clearPendingClaim(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_CLAIM_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
