import { describe, expect, it } from "vitest";

import {
  emptyFuelFillFormState,
  mapExtractionToFuelFillForm,
} from "./map-extraction-to-form";

describe("mapExtractionToFuelFillForm", () => {
  it("fills date amount and liters from extraction", () => {
    const base = emptyFuelFillFormState();
    const next = mapExtractionToFuelFillForm(
      {
        date: "2026-04-12",
        totalAmount: 89.5,
        liters: 42.3,
        pricePerLiter: 1.899,
      },
      base,
    );
    expect(next.occurredOn).toBe("2026-04-12");
    expect(next.amountEur).toContain("89");
    expect(next.fuelLiters).toBe("42,3");
    expect(next.pricePerLiterEur).toBe("1,899");
    expect(next.odometerKm).toBe("");
  });

  it("keeps existing odometer when merging", () => {
    const base = { ...emptyFuelFillFormState(), odometerKm: "120000" };
    const next = mapExtractionToFuelFillForm(
      { date: null, totalAmount: 50, liters: null, pricePerLiter: null },
      base,
    );
    expect(next.odometerKm).toBe("120000");
  });
});
