import { describe, expect, it } from "vitest";

import {
  prejoinWrappedInvoiceLines,
  realignShiftedInvoiceLineItems,
} from "./invoice-line-item-alignment";

describe("realignShiftedInvoiceLineItems", () => {
  it("fixes amounts shifted one row down (header row consumes first amount)", () => {
    const shifted = [
      { label: "Bezeichnung", amount: 480 },
      { label: "Sportfedern H&R", amount: 120 },
      { label: "Arbeitslohn", amount: 45 },
      { label: "Entsorgung", amount: 12 },
    ];

    const fixed = realignShiftedInvoiceLineItems(shifted, 657);
    expect(fixed).toEqual([
      { label: "Sportfedern H&R", amount: 480 },
      { label: "Arbeitslohn", amount: 120 },
      { label: "Entsorgung", amount: 45 },
    ]);
  });

  it("fixes amounts paired with the next row when total matches", () => {
    const shifted = [
      { label: "Ölfilter", amount: 89.9 },
      { label: "Motoröl 5W-30", amount: 42.5 },
    ];

    const fixed = realignShiftedInvoiceLineItems(shifted, 42.5);
    expect(fixed).toEqual([{ label: "Ölfilter", amount: 42.5 }]);
  });

  it("keeps already correct rows unchanged", () => {
    const items = [
      { label: "Bremsbeläge vorne", amount: 189.9 },
      { label: "Arbeitslohn", amount: 95 },
    ];

    expect(realignShiftedInvoiceLineItems(items, 284.9)).toEqual(items);
  });
});

describe("prejoinWrappedInvoiceLines", () => {
  it("joins a wrapped description with the amount on the next line", () => {
    const text = ["Sportfedern H&R Tieferlegung", "480,00"].join("\n");
    expect(prejoinWrappedInvoiceLines(text)).toBe(
      "Sportfedern H&R Tieferlegung 480,00",
    );
  });
});
