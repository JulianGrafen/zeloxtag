"use client";

import { useEffect, useMemo, useState } from "react";

import { GuidedTour } from "@/components/onboarding/guided-tour";
import {
  clearForcedDashboardTourFromUrl,
  getDashboardTourSteps,
  markDashboardTourCompleted,
  resolveAvailableTourSteps,
  type DashboardTourRole,
} from "@/lib/onboarding/dashboard-tour";

type DashboardOnboardingTourProps = {
  enabled: boolean;
  role: DashboardTourRole;
  /** First registration after claim (`?tour=1`). */
  force?: boolean;
  onSettled?: () => void;
};

/**
 * Guided tour over the vehicle dashboard tiles + scan CTA.
 * Runs once after first-time registration (new account + tag claim).
 */
export function DashboardOnboardingTour({
  enabled,
  role,
  force = false,
  onSettled,
}: DashboardOnboardingTourProps) {
  const [open, setOpen] = useState(false);
  const catalog = useMemo(() => getDashboardTourSteps(role), [role]);
  const [steps, setSteps] = useState(catalog);

  useEffect(() => {
    if (!enabled || !force) return;

    const start = () => {
      const available = resolveAvailableTourSteps(catalog);
      setSteps(available.length > 0 ? available : catalog);
      setOpen(true);
    };

    const timer = window.setTimeout(start, 400);
    return () => window.clearTimeout(timer);
  }, [enabled, catalog, force]);

  function finish() {
    markDashboardTourCompleted();
    setOpen(false);
    clearForcedDashboardTourFromUrl();
    onSettled?.();
  }

  if (!enabled) return null;

  return (
    <GuidedTour
      open={open}
      steps={steps}
      onComplete={finish}
      onSkip={finish}
    />
  );
}
