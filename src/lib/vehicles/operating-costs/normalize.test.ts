import { describe, expect, it } from "vitest";

import { normalizeOperatingCostInput } from "./normalize";

describe("normalizeOperatingCostInput", () => {
  it("accepts a valid fuel entry", () => {
    const result = normalizeOperatingCostInput({
      category: "fuel",
      amountEur: "89,50",
      occurredOn: "2026-05-01",
      billingPeriod: "once",
      fuelLiters: "42",
      odometerKm: "62.000",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amountEur).toBe(89.5);
      expect(result.value.fuelLiters).toBe(42);
      expect(result.value.odometerKm).toBe(62000);
    }
  });

  it("rejects yearly billing on fuel", () => {
    const result = normalizeOperatingCostInput({
      category: "fuel",
      amountEur: "50",
      occurredOn: "2026-05-01",
      billingPeriod: "yearly",
    });
    expect(result.ok).toBe(false);
  });
});
