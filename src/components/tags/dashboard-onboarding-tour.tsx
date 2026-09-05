"use client";

import { useEffect, useMemo, useState } from "react";

import { clearPendingDashboardTourAction } from "@/actions/dashboard-tour";
import { GuidedTour } from "@/components/onboarding/guided-tour";
import {
  clearForcedDashboardTourFromUrl,
  getDashboardTourSteps,
  markDashboardTourCompleted,
  resolveAvailableTourSteps,
  wantsForcedDashboardTour,
  type DashboardTourRole,
} from "@/lib/onboarding/dashboard-tour";

type DashboardOnboardingTourProps = {
  enabled: boolean;
  role: DashboardTourRole;
  /** First registration after claim (`?tour=1` or pending tour cookie). */
  force?: boolean;
  onSettled?: () => void;
  onOpenChange?: (open: boolean) => void;
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
  onOpenChange,
}: DashboardOnboardingTourProps) {
  const [open, setOpen] = useState(false);
  const [forceTour, setForceTour] = useState(force);
  const catalog = useMemo(() => getDashboardTourSteps(role), [role]);
  const [steps, setSteps] = useState(catalog);

  useEffect(() => {
    if (force) {
      setForceTour(true);
      return;
    }
    if (wantsForcedDashboardTour()) {
      setForceTour(true);
    }
  }, [force]);

  useEffect(() => {
    if (!enabled || !forceTour) return;

    let cancelled = false;
    const timers: number[] = [];

    const tryStart = (attempt = 0) => {
      if (cancelled) return;
      const available = resolveAvailableTourSteps(catalog);
      if (available.length > 0 || attempt >= 8) {
        setSteps(available.length > 0 ? available : catalog);
        setOpen(true);
        return;
      }
      timers.push(window.setTimeout(() => tryStart(attempt + 1), 250));
    };

    timers.push(window.setTimeout(() => tryStart(), 300));

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [enabled, catalog, forceTour]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  async function finish() {
    markDashboardTourCompleted();
    try {
      await clearPendingDashboardTourAction();
    } catch {
      /* non-fatal */
    }
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
