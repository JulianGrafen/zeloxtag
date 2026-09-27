import { describe, expect, it } from "vitest";

import {
  looksLikeLiterPriceNotVolume,
  reconcileFuelLiters,
} from "./fuel-receipt-reconcile";

describe("reconcileFuelLiters", () => {
  it("derives liters from total and price per liter when OCR confused €/L with volume", () => {
    const liters = reconcileFuelLiters({
      liters: 1.89,
      totalAmount: 80.12,
      pricePerLiter: 1.89,
    });
    expect(liters).toBeCloseTo(42.39, 1);
  });

  it("keeps OCR liters when consistent with total and price", () => {
    const liters = reconcileFuelLiters({
      liters: 42.38,
      totalAmount: 80.1,
      pricePerLiter: 1.889,
    });
    expect(liters).toBe(42.38);
  });

  it("fills liters from total and price when volume missing", () => {
    const liters = reconcileFuelLiters({
      liters: null,
      totalAmount: 50,
      pricePerLiter: 1.75,
    });
    expect(liters).toBeCloseTo(28.57, 2);
  });
});

describe("looksLikeLiterPriceNotVolume", () => {
  it("flags typical liter price mistaken as volume", () => {
    expect(looksLikeLiterPriceNotVolume(1.92, 75)).toBe(true);
    expect(looksLikeLiterPriceNotVolume(42.5, 75)).toBe(false);
  });
});
