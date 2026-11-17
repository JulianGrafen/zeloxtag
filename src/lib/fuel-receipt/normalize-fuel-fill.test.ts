import { describe, expect, it } from "vitest";

import { emptyFuelFillFormState } from "./map-extraction-to-form";
import { normalizeFuelFillInput } from "./normalize-fuel-fill";

describe("normalizeFuelFillInput", () => {
  it("requires odometer", () => {
    const result = normalizeFuelFillInput({
      ...emptyFuelFillFormState(),
      amountEur: "50",
      odometerKm: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/Kilometerstand/i);
    }
  });

  it("derives total from liters and liter price on save", () => {
    const result = normalizeFuelFillInput({
      ...emptyFuelFillFormState(),
      fuelLiters: "40",
      pricePerLiterEur: "1,899",
      amountEur: "",
      odometerKm: "120000",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.amountEur).toBe(75.96);
      expect(result.value.fuelLiters).toBe(40);
    }
  });

  it("accepts valid fuel fill", () => {
    const result = normalizeFuelFillInput({
      ...emptyFuelFillFormState(),
      amountEur: "89,50",
      fuelLiters: "38",
      odometerKm: "62.000",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.category).toBe("fuel");
      expect(result.value.odometerKm).toBe(62000);
    }
  });
});
