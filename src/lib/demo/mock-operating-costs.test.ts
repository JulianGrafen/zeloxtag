import { describe, expect, it } from "vitest";

import { buildOperatingCostSummary } from "@/lib/vehicles/operating-costs/summary";
import { MOCK_DEMO_VEHICLE_ID } from "@/lib/tags/mock-tags";

import {
  getDemoOperatingCostsForVehicle,
  MOCK_DEMO_OPERATING_COSTS,
} from "./mock-operating-costs";

describe("mock operating costs", () => {
  it("returns entries only for the demo vehicle id", () => {
    expect(getDemoOperatingCostsForVehicle(MOCK_DEMO_VEHICLE_ID).length).toBe(
      MOCK_DEMO_OPERATING_COSTS.length,
    );
    expect(getDemoOperatingCostsForVehicle("other-id")).toEqual([]);
  });

  it("includes fuel history with computable consumption", () => {
    const entries = getDemoOperatingCostsForVehicle(MOCK_DEMO_VEHICLE_ID);
    const summary = buildOperatingCostSummary(entries);
    expect(summary.fuelStats.lastFill?.occurred_on).toBe("2026-03-08");
    expect(summary.fuelStats.consumptionSegmentCount).toBeGreaterThan(0);
    expect(summary.totalMonthlyAverage).toBeGreaterThan(0);
  });
});
