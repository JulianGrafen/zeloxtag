import { describe, expect, it } from "vitest";

import { emptyFuelFillFormState } from "./map-extraction-to-form";
import {
  applyFuelFillFieldChange,
  completeFuelFillDerivedFields,
} from "./fuel-fill-derived-fields";

describe("applyFuelFillFieldChange", () => {
  it("derives total from liters and price per liter", () => {
    const base = emptyFuelFillFormState();
    const next = applyFuelFillFieldChange(
      { ...base, fuelLiters: "40", pricePerLiterEur: "1,899" },
      "pricePerLiterEur",
      "1,899",
    );
    expect(next.amountEur).toBe("75,96");
  });

  it("derives price per liter from liters and total", () => {
    const base = emptyFuelFillFormState();
    const next = applyFuelFillFieldChange(
      { ...base, fuelLiters: "50", amountEur: "100" },
      "amountEur",
      "100",
    );
    expect(next.pricePerLiterEur).toBe("2");
  });

  it("derives liters from total and price per liter", () => {
    const base = emptyFuelFillFormState();
    const next = applyFuelFillFieldChange(
      { ...base, amountEur: "75,96", pricePerLiterEur: "1,899" },
      "amountEur",
      "75,96",
    );
    expect(next.fuelLiters).toBe("40");
  });
});

describe("completeFuelFillDerivedFields", () => {
  it("fills missing liters on save when amount and price are set", () => {
    const completed = completeFuelFillDerivedFields({
      ...emptyFuelFillFormState(),
      amountEur: "50",
      pricePerLiterEur: "2",
      fuelLiters: "",
    });
    expect(completed.fuelLiters).toBe("25");
  });
});
