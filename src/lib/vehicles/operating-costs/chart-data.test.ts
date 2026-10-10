import { describe, expect, it } from "vitest";

import type { VehicleOperatingCost } from "@/types/database";

import { buildOperatingCostChartData } from "./chart-data";

function entry(
  partial: Partial<VehicleOperatingCost> &
    Pick<VehicleOperatingCost, "category" | "amount_eur" | "occurred_on" | "billing_period">,
): VehicleOperatingCost {
  return {
    id: "e-1",
    vehicle_id: "v-1",
    user_id: "u-1",
    note: null,
    fuel_liters: null,
    odometer_km: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

describe("buildOperatingCostChartData", () => {
  it("aggregates category totals in the rolling window", () => {
    const data = buildOperatingCostChartData(
      [
        entry({
          category: "fuel",
          amount_eur: 100,
          occurred_on: "2026-05-10",
          billing_period: "once",
        }),
        entry({
          category: "insurance",
          amount_eur: 600,
          occurred_on: "2026-01-01",
          billing_period: "yearly",
        }),
      ],
      new Date("2026-06-15T12:00:00"),
    );

    expect(data.grandTotal).toBeGreaterThan(0);
    expect(data.categoryTotals.fuel).toBe(100);
    expect(data.categoryTotals.insurance).toBe(300);
    expect(data.months).toHaveLength(12);
    expect(data.categorySlices[0]?.category).toBe("insurance");
  });
});
