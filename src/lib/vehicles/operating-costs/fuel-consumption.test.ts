import { describe, expect, it } from "vitest";

import type { VehicleOperatingCost } from "@/types/database";

import {
  computeFuelConsumptionSegments,
  computeFuelConsumptionStats,
} from "./fuel-consumption";

function fuelRow(
  overrides: Partial<VehicleOperatingCost> & {
    id: string;
    occurred_on: string;
  },
): VehicleOperatingCost {
  return {
    id: overrides.id,
    vehicle_id: "vehicle-1",
    user_id: "user-1",
    category: "fuel",
    billing_period: "once",
    amount_eur: overrides.amount_eur ?? 80,
    occurred_on: overrides.occurred_on,
    fuel_liters: overrides.fuel_liters ?? null,
    odometer_km: overrides.odometer_km ?? null,
    note: overrides.note ?? null,
    created_at: overrides.created_at ?? `${overrides.occurred_on}T10:00:00.000Z`,
    updated_at: overrides.updated_at ?? `${overrides.occurred_on}T10:00:00.000Z`,
  };
}

describe("fuel consumption", () => {
  it("computes l/100 km from consecutive fills with odometer and liters", () => {
    const entries = [
      fuelRow({
        id: "a",
        occurred_on: "2026-01-01",
        odometer_km: 10_000,
        fuel_liters: 40,
        amount_eur: 80,
      }),
      fuelRow({
        id: "b",
        occurred_on: "2026-02-01",
        odometer_km: 10_500,
        fuel_liters: 35,
        amount_eur: 70,
      }),
    ];

    const segments = computeFuelConsumptionSegments(entries);
    expect(segments).toHaveLength(1);
    expect(segments[0]?.entryId).toBe("b");
    expect(segments[0]?.litersPer100Km).toBe(7);
    expect(segments[0]?.eurosPer100Km).toBe(14);
    expect(segments[0]?.kmDelta).toBe(500);
  });

  it("returns empty stats when fewer than two usable fills", () => {
    const stats = computeFuelConsumptionStats([
      fuelRow({
        id: "a",
        occurred_on: "2026-01-01",
        odometer_km: 10_000,
        fuel_liters: 40,
      }),
    ]);
    expect(stats.latestLitersPer100Km).toBeNull();
    expect(stats.segmentCount).toBe(0);
  });

  it("averages multiple segments", () => {
    const entries = [
      fuelRow({
        id: "a",
        occurred_on: "2026-01-01",
        odometer_km: 1000,
        fuel_liters: 10,
      }),
      fuelRow({
        id: "b",
        occurred_on: "2026-02-01",
        odometer_km: 2000,
        fuel_liters: 80,
      }),
      fuelRow({
        id: "c",
        occurred_on: "2026-03-01",
        odometer_km: 3000,
        fuel_liters: 60,
      }),
    ];

    const stats = computeFuelConsumptionStats(entries);
    expect(stats.segmentCount).toBe(2);
    expect(stats.latestLitersPer100Km).toBe(6);
    expect(stats.averageLitersPer100Km).toBe(7);
  });
});
