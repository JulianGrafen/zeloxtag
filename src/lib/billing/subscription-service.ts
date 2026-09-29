import "server-only";

import { FREE_AI_FUEL_SCAN_LIMIT } from "@/lib/billing/free-scan-constants";
import { getFreeFuelScanQuota, type FreeScanQuota } from "@/lib/billing/free-scan-quota";
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { MAX_FREE_FUEL_SCANS } from "@/lib/billing/subscription-config";
import type {
  FuelScanTierSnapshot,
  UserSubscriptionStatus,
} from "@/lib/billing/subscription-types";

export type { FuelScanTierSnapshot, UserSubscriptionStatus };

export function buildFuelScanSubscriptionStatus(
  isPro: boolean,
  quota: FreeScanQuota | null,
): UserSubscriptionStatus {
  const totalFreeScans = quota?.limit ?? MAX_FREE_FUEL_SCANS;
  const quotaUnavailable = quota == null && !isPro;

  if (isPro) {
    return {
      isPro: true,
      remainingFreeScans: totalFreeScans,
      totalFreeScans,
      canScan: true,
      quotaUnavailable: false,
    };
  }

  if (quotaUnavailable) {
    return {
      isPro: false,
      remainingFreeScans: 0,
      totalFreeScans,
      canScan: false,
      quotaUnavailable: true,
    };
  }

  const remainingFreeScans = Math.max(0, quota?.remaining ?? 0);

  return {
    isPro: false,
    remainingFreeScans,
    totalFreeScans,
    canScan: remainingFreeScans > 0,
    quotaUnavailable: false,
  };
}

export async function loadFuelScanSubscriptionForOwner(
  ownerUserId: string,
): Promise<UserSubscriptionStatus> {
  if (!ownerUserId) {
    return buildFuelScanSubscriptionStatus(false, null);
  }

  try {
    const isPro = await userHasActiveMembership(ownerUserId);
    if (isPro) {
      return buildFuelScanSubscriptionStatus(true, {
        used: 0,
        remaining: FREE_AI_FUEL_SCAN_LIMIT,
        limit: FREE_AI_FUEL_SCAN_LIMIT,
      });
    }

    const quota = await getFreeFuelScanQuota(ownerUserId);
    return buildFuelScanSubscriptionStatus(false, quota);
  } catch (error) {
    console.error("[subscription-service] fuel scan tier failed", error);
    return buildFuelScanSubscriptionStatus(false, null);
  }
}
