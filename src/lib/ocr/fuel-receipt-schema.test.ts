import { describe, expect, it } from "vitest";

import {
  isFuelReceiptOcrFields,
  normalizeFuelReceiptOcrFields,
} from "./fuel-receipt-schema";

describe("fuel-receipt-schema", () => {
  it("normalizes positive amounts and liters", () => {
    const fields = normalizeFuelReceiptOcrFields({
      date: "2026-01-15",
      totalAmount: 99.999,
      liters: 40.111,
      pricePerLiter: null,
    });
    expect(fields.date).toBe("2026-01-15");
    expect(fields.totalAmount).toBe(100);
    expect(fields.liters).toBe(40.11);
  });

  it("validates schema shape", () => {
    expect(
      isFuelReceiptOcrFields({
        date: "2026-01-01",
        totalAmount: 50,
        liters: null,
        pricePerLiter: 1.85,
      }),
    ).toBe(true);
    expect(
      isFuelReceiptOcrFields({
        date: "bad",
        totalAmount: 1,
        liters: 1,
        pricePerLiter: null,
      }),
    ).toBe(false);
  });
});
