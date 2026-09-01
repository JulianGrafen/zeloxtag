"use server";

import { clearPendingDashboardTour } from "@/lib/onboarding/pending-dashboard-tour";

export async function clearPendingDashboardTourAction(): Promise<void> {
  await clearPendingDashboardTour();
}
