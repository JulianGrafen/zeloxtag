export type UserSubscriptionStatus = {
  isPro: boolean;
  remainingFreeScans: number;
  totalFreeScans: number;
  canScan: boolean;
  quotaUnavailable: boolean;
};

export type FuelScanTierSnapshot = UserSubscriptionStatus;
