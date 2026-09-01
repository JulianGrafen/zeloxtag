import "server-only";

import { cookies } from "next/headers";

export const PENDING_DASHBOARD_TOUR_COOKIE = "zt_pending_dashboard_tour";

const MAX_AGE_SECONDS = 60 * 60; // match pending claim window

function tourCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/** Queue onboarding tour for the next owner dashboard load (survives redirect hops). */
export async function setPendingDashboardTour(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_DASHBOARD_TOUR_COOKIE, "1", {
    ...tourCookieOptions(MAX_AGE_SECONDS),
  });
}

export async function hasPendingDashboardTour(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(PENDING_DASHBOARD_TOUR_COOKIE)?.value === "1";
}

export async function clearPendingDashboardTour(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_DASHBOARD_TOUR_COOKIE, "", {
    ...tourCookieOptions(0),
  });
}
