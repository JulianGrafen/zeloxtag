"use client";

import { useCallback, useMemo, useState } from "react";

import type { FuelScanTierSnapshot } from "@/lib/billing/subscription-types";

type UseUserTierOptions = {
  initial: FuelScanTierSnapshot;
};

/**
 * Client subscription snapshot for fuel KI scans (decoupled from UI).
 */
export function useUserTier({ initial }: UseUserTierOptions) {
  const [remainingFreeScans, setRemainingFreeScans] = useState(
    initial.remainingFreeScans,
  );
  const [isPro] = useState(initial.isPro);
  const totalFreeScans = initial.totalFreeScans;

  const canScan = useMemo(() => {
    if (isPro) return true;
    if (initial.quotaUnavailable) return false;
    return remainingFreeScans > 0;
  }, [initial.quotaUnavailable, isPro, remainingFreeScans]);

  const decrementScanCount = useCallback(async () => {
    if (isPro) return;
    setRemainingFreeScans((value) => Math.max(0, value - 1));
  }, [isPro]);

  return {
    isPro,
    remainingFreeScans,
    totalFreeScans,
    canScan,
    decrementScanCount,
  };
}
