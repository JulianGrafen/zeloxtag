import { describe, expect, it } from "vitest";

import type { VehicleOperatingCost } from "@/types/database";

import {
  describeOperatingCostEntry,
  formatFuelLiters,
  formatPricePerLiter,
} from "./operating-cost-entry-display";

function makeEntry(overrides: Partial<VehicleOperatingCost> = {}): VehicleOperatingCost {
  return {
    id: "entry-1",
    vehicle_id: "vehicle-1",
    user_id: "user-1",
    category: "fuel",
    amount_eur: 80.33,
    occurred_on: "2026-10-12",
    billing_period: "once",
    note: null,
    fuel_liters: 44.65,
    odometer_km: 187430,
    created_at: "2026-10-12T10:00:00Z",
    updated_at: "2026-10-12T10:00:00Z",
    ...overrides,
  };
}

describe("formatFuelLiters", () => {
  it("formats liters with German decimals", () => {
    expect(formatFuelLiters(42.5)).toBe("42,5 L");
  });

  it.each([null, undefined, 0, -3, Number.NaN])("returns null for %s", (value) => {
    expect(formatFuelLiters(value)).toBeNull();
  });
});

describe("formatPricePerLiter", () => {
  it("derives a three-decimal pump price", () => {
    expect(formatPricePerLiter(80.33, 44.65)).toBe("1,799\u00a0€/L");
  });

  it("returns null without usable liters", () => {
    expect(formatPricePerLiter(80, null)).toBeNull();
    expect(formatPricePerLiter(80, 0)).toBeNull();
    expect(formatPricePerLiter(null, 40)).toBeNull();
  });
});

describe("describeOperatingCostEntry", () => {
  it("uses the date as title for a fuel stop without note", () => {
    const display = describeOperatingCostEntry(makeEntry(), 7.84);

    expect(display.title).toBe("12.10.2026");
    expect(display.meta).toBe("44,65 L · 187.430 km · 1,799\u00a0€/L · 7,8 l/100 km");
  });

  it("uses the station note as title and moves the date into meta", () => {
    const display = describeOperatingCostEntry(
      makeEntry({ note: "  Aral Autobahn  ", odometer_km: null }),
    );

    expect(display.title).toBe("Aral Autobahn");
    expect(display.meta).toBe("12.10.2026 · 44,65 L · 1,799\u00a0€/L");
  });

  it("shows category and billing period for recurring costs", () => {
    const display = describeOperatingCostEntry(
      makeEntry({
        category: "insurance",
        billing_period: "monthly",
        fuel_liters: null,
        odometer_km: null,
      }),
    );

    expect(display.title).toBe("Versicherung");
    expect(display.meta).toBe("12.10.2026 · Monatlich");
  });

  it("keeps the category in meta when a note replaces the title", () => {
    const display = describeOperatingCostEntry(
      makeEntry({ category: "tax", note: "Kfz-Steuer 2026", fuel_liters: null }),
    );

    expect(display.title).toBe("Kfz-Steuer 2026");
    expect(display.meta).toBe("12.10.2026 · Steuer & Gebühren");
  });
});
