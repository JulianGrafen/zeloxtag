import { describe, expect, it } from "vitest";

import type { VehicleOperatingCost } from "@/types/database";

import { fuelOperatingCostToFormState } from "./fuel-entry-form-state";

describe("fuelOperatingCostToFormState", () => {
  it("maps stored fuel rows into the manual form", () => {
    const entry: VehicleOperatingCost = {
      id: "entry-1",
      vehicle_id: "vehicle-1",
      user_id: "user-1",
      category: "fuel",
      billing_period: "once",
      amount_eur: 89.5,
      occurred_on: "2026-05-01",
      fuel_liters: 42.5,
      odometer_km: 62_000,
      note: "Volltankung",
      created_at: "2026-05-01T10:00:00.000Z",
      updated_at: "2026-05-01T10:00:00.000Z",
    };

    expect(fuelOperatingCostToFormState(entry)).toEqual({
      occurredOn: "2026-05-01",
      amountEur: "89,50",
      fuelLiters: "42,5",
      pricePerLiterEur: "2,106",
      odometerKm: "62000",
      note: "Volltankung",
    });
  });
});
