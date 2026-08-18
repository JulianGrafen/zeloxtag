"use client";

import { useEffect, useMemo, useState } from "react";

import { GuidedTour } from "@/components/onboarding/guided-tour";
import {
  clearForcedDashboardTourFromUrl,
  getDashboardTourSteps,
  hasCompletedDashboardTour,
  markDashboardTourCompleted,
  resolveAvailableTourSteps,
  wantsForcedDashboardTour,
  type DashboardTourRole,
} from "@/lib/onboarding/dashboard-tour";

type DashboardOnboardingTourProps = {
  enabled: boolean;
  role: DashboardTourRole;
  /** Stripe return / ?tour=1 — start even if previously completed. */
  force?: boolean;
  /** First-visit auto-start (Free visitenkarte included). */
  autoStart?: boolean;
  onSettled?: () => void;
};

/**
 * Guided tour over the vehicle dashboard tiles + scan CTA.
 * Owners start it after claiming a tag; it also restarts after Stripe checkout.
 */
export function DashboardOnboardingTour({
  enabled,
  role,
  force = false,
  autoStart = true,
  onSettled,
}: DashboardOnboardingTourProps) {
  const [open, setOpen] = useState(false);
  const catalog = useMemo(() => getDashboardTourSteps(role), [role]);
  const [steps, setSteps] = useState(catalog);

  useEffect(() => {
    if (!enabled) return;

    const forceTour = force || wantsForcedDashboardTour();

    const start = () => {
      const available = resolveAvailableTourSteps(catalog);
      setSteps(available.length > 0 ? available : catalog);
      setOpen(true);
    };

    if (forceTour) {
      const timer = window.setTimeout(start, 400);
      return () => window.clearTimeout(timer);
    }

    if (!autoStart) return;
    if (hasCompletedDashboardTour()) return;

    // Wait for header car animation + tile stagger to settle.
    const timer = window.setTimeout(start, 1100);
    return () => window.clearTimeout(timer);
  }, [enabled, catalog, force, autoStart]);

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
