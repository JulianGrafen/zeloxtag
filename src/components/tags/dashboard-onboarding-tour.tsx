"use client";

import { useEffect, useMemo, useState } from "react";

import { GuidedTour } from "@/components/onboarding/guided-tour";
import {
  getDashboardTourSteps,
  hasCompletedDashboardTour,
  markDashboardTourCompleted,
  resolveAvailableTourSteps,
  type DashboardTourRole,
} from "@/lib/onboarding/dashboard-tour";

type DashboardOnboardingTourProps = {
  enabled: boolean;
  role: DashboardTourRole;
};

function wantsForcedTour(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("tour") === "1";
}

/**
 * First-login guided tour over the vehicle dashboard tiles + scan CTA.
 */
export function DashboardOnboardingTour({
  enabled,
  role,
}: DashboardOnboardingTourProps) {
  const [open, setOpen] = useState(false);
  const catalog = useMemo(() => getDashboardTourSteps(role), [role]);
  const [steps, setSteps] = useState(catalog);

  useEffect(() => {
    if (!enabled) return;

    const forceTour = wantsForcedTour();

    const start = () => {
      const available = resolveAvailableTourSteps(catalog);
      setSteps(available.length > 0 ? available : catalog);
      setOpen(true);
    };

    if (forceTour) {
      const timer = window.setTimeout(start, 400);
      return () => window.clearTimeout(timer);
    }

    if (hasCompletedDashboardTour()) return;

    // Wait for header car animation + tile stagger to settle.
    const timer = window.setTimeout(start, 1100);
    return () => window.clearTimeout(timer);
  }, [enabled, catalog]);

  function finish() {
    markDashboardTourCompleted();
    setOpen(false);
    if (wantsForcedTour()) {
      const url = new URL(window.location.href);
      url.searchParams.delete("tour");
      window.history.replaceState({}, "", url.toString());
    }
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
