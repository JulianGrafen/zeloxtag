import { resolvePostLoginPath } from "@/lib/auth/post-login-path";
import {
  dashboardTourHref,
  withForcedDashboardTour,
} from "@/lib/onboarding/dashboard-tour";
import {
  hasPendingDashboardTour,
  setPendingDashboardTour,
} from "@/lib/onboarding/pending-dashboard-tour";
import { userHasGarageVehicle } from "@/lib/auth/user-has-vehicle";
import { completePendingClaimForUser } from "@/lib/tags/complete-pending-claim";

export type AuthenticatedDestinationResult =
  | { status: "ok"; href: string }
  | { status: "error"; message: string };

/**
 * Resolves where a signed-in user should land after auth confirmation or login.
 */
export async function resolveAuthenticatedDestination(
  userId: string,
): Promise<AuthenticatedDestinationResult> {
  try {
    const claimResult = await completePendingClaimForUser(userId);
    if (claimResult?.status === "claimed") {
      await setPendingDashboardTour();
      return { status: "ok", href: dashboardTourHref(claimResult.tagUuid) };
    }
    if (claimResult?.status === "error") {
      return { status: "error", message: claimResult.message };
    }
  } catch {
    /* optional — fall through to dashboard resolve */
  }

  const path = await resolvePostLoginPath(userId);
  if (path === "/dashboard" && !(await userHasGarageVehicle(userId))) {
    return { status: "ok", href: "/onboarding/fahrzeug" };
  }

  const pendingTour = await hasPendingDashboardTour();
  const tourEligible =
    path.startsWith("/v/") || path.startsWith("/garage/");
  const href =
    pendingTour && tourEligible ? withForcedDashboardTour(path) : path;

  return { status: "ok", href };
}
