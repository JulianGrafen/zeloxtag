import { cookies } from "next/headers";

import { setPendingDashboardTour } from "@/lib/onboarding/pending-dashboard-tour";

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
};

const MAX_AGE_SECONDS = 60 * 60; // 1 hour

export async function setPendingClaim(claim: PendingClaim): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_CLAIM_COOKIE, JSON.stringify(claim), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  await setPendingDashboardTour();
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
