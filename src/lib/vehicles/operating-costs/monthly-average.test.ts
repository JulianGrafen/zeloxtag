import { describe, expect, it } from "vitest";

import type { VehicleOperatingCost } from "@/types/database";

import {
  computeMonthlyAverages,
  rollingMonthWindowEnd,
  rollingMonthWindowStart,
} from "./monthly-average";

function entry(
  partial: Partial<VehicleOperatingCost> & Pick<VehicleOperatingCost, "category" | "amount_eur" | "occurred_on" | "billing_period">,
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

describe("computeMonthlyAverages", () => {
  it("returns zero averages for empty entries", () => {
    const result = computeMonthlyAverages([], new Date("2026-06-15T12:00:00"));
    expect(result.totalMonthlyAverage).toBe(0);
    expect(result.categoryMonthlyAverages.fuel).toBe(0);
  });

  it("averages yearly insurance over 12 months", () => {
    const result = computeMonthlyAverages(
      [
        entry({
          category: "insurance",
          amount_eur: 1200,
          occurred_on: "2026-01-10",
          billing_period: "yearly",
        }),
      ],
      new Date("2026-06-15T12:00:00"),
    );
    // Jan–Jun 2026 in window → 6 × €100, divided by 12-month divisor
    expect(result.categoryMonthlyAverages.insurance).toBe(50);
    expect(result.totalMonthlyAverage).toBe(50);
  });

  it("counts fuel once in the month of fill-up", () => {
    const result = computeMonthlyAverages(
      [
        entry({
          category: "fuel",
          amount_eur: 90,
          occurred_on: "2026-05-20",
          billing_period: "once",
        }),
      ],
      new Date("2026-06-15T12:00:00"),
    );
    expect(result.categoryMonthlyAverages.fuel).toBe(7.5);
  });
});

describe("rollingMonthWindow", () => {
  it("spans 12 months", () => {
    const end = rollingMonthWindowEnd(new Date("2026-03-10T12:00:00"));
    const start = rollingMonthWindowStart(end);
    expect(end).toBe("2026-03");
    expect(start).toBe("2025-04");
  });
});
