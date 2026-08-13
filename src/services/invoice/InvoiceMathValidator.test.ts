import { describe, expect, it } from "vitest";

import {
  INVOICE_LINE_MATH_TOLERANCE_EUR,
  validateAndFixLineItems,
} from "@/services/invoice/InvoiceMathValidator";

describe("validateAndFixLineItems", () => {
  it("defaults quantity to 1 when missing or zero", () => {
    const [fixed] = validateAndFixLineItems([
      {
        description: "Ölfilter",
        quantity: 0,
        unit_price: 23.86,
        total_price: 23.86,
      },
    ]);

    expect(fixed!.quantity).toBe(1);
    expect(fixed!.is_math_valid).toBe(true);
  });

  it("derives unit_price from total_price / quantity", () => {
    const [fixed] = validateAndFixLineItems([
      {
        description: "Bremsscheibe PRO+",
        quantity: 2,
        unit_price: null,
        total_price: 331.98,
      },
    ]);

    expect(fixed!.unit_price).toBe(165.99);
    expect(fixed!.is_math_valid).toBe(true);
  });

  it("marks row invalid when math drifts beyond tolerance", () => {
    const [fixed] = validateAndFixLineItems([
      {
        description: "Shifted row",
        quantity: 1,
        unit_price: 90,
        total_price: 360,
      },
    ]);

    expect(fixed!.is_math_valid).toBe(false);
  });

  it("accepts fractional labor quantities (Blotzheim: 0.90 × 90 = 81)", () => {
    const [fixed] = validateAndFixLineItems([
      {
        description: "Beide Bremsscheiben erneuern (Hinterachse)",
        quantity: 0.9,
        unit_price: 90,
        total_price: 81,
      },
    ]);

    expect(fixed!.is_math_valid).toBe(true);
  });

  it("uses tolerance boundary from INVOICE_LINE_MATH_TOLERANCE_EUR", () => {
    const within = validateAndFixLineItems([
      {
        description: "Rounding edge",
        quantity: 3,
        unit_price: 7.14,
        total_price: 21.42,
      },
    ]);
    expect(within[0]!.is_math_valid).toBe(true);
    expect(INVOICE_LINE_MATH_TOLERANCE_EUR).toBe(0.05);
  });
});
