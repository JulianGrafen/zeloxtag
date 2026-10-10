import { describe, expect, it } from "vitest";

import { buildFuelScanSubscriptionStatus } from "./subscription-service";
import { MAX_FREE_FUEL_SCANS } from "./subscription-config";

describe("buildFuelScanSubscriptionStatus", () => {
  it("grants unlimited scan for Pro", () => {
    const status = buildFuelScanSubscriptionStatus(true, {
      used: 3,
      remaining: 0,
      limit: 3,
    });
    expect(status.isPro).toBe(true);
    expect(status.canScan).toBe(true);
  });

  it("blocks scan when free quota is exhausted", () => {
    const status = buildFuelScanSubscriptionStatus(false, {
      used: MAX_FREE_FUEL_SCANS,
      remaining: 0,
      limit: MAX_FREE_FUEL_SCANS,
    });
    expect(status.canScan).toBe(false);
    expect(status.remainingFreeScans).toBe(0);
  });

  it("fails closed when quota is unavailable", () => {
    const status = buildFuelScanSubscriptionStatus(false, null);
    expect(status.quotaUnavailable).toBe(true);
    expect(status.canScan).toBe(false);
  });

  it("allows scan when entitlement read failed but UI shows full bucket", () => {
    const status = buildFuelScanSubscriptionStatus(false, {
      used: 0,
      remaining: MAX_FREE_FUEL_SCANS,
      limit: MAX_FREE_FUEL_SCANS,
      readFailed: true,
    });
    expect(status.canScan).toBe(true);
    expect(status.remainingFreeScans).toBe(MAX_FREE_FUEL_SCANS);
  });
});
