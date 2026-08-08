import { describe, expect, it } from "vitest";

import {
  dedupeInvoiceLineItemUnitPrices,
  isUnitPriceAmountOfTotal,
} from "@/lib/ocr/invoice-line-item-dedupe";

describe("isUnitPriceAmountOfTotal", () => {
  it("detects qty × unit = total", () => {
    expect(isUnitPriceAmountOfTotal(120, 480)).toBe(true);
    expect(isUnitPriceAmountOfTotal(141.6, 141.6)).toBe(false);
  });
});

describe("dedupeInvoiceLineItemUnitPrices", () => {
  it("keeps Gesamtpreis when Einzelpreis was duplicated for same label", () => {
    const result = dedupeInvoiceLineItemUnitPrices([
      { label: "Reifen", amount: 120 },
      { label: "Reifen", amount: 480 },
    ]);

    expect(result).toEqual([{ label: "Reifen", amount: 480 }]);
  });

  it("drops price-only label row when real position exists", () => {
    const result = dedupeInvoiceLineItemUnitPrices([
      { label: "141,60", amount: 141.6 },
      { label: "Sportfedern", amount: 141.6 },
    ]);

    expect(result).toEqual([{ label: "Sportfedern", amount: 141.6 }]);
  });

  it("drops orphan unit price without matching label key", () => {
    const result = dedupeInvoiceLineItemUnitPrices([
      { label: "120,00", amount: 120 },
      { label: "Reifenwechsel", amount: 480 },
    ]);

    expect(result).toEqual([{ label: "Reifenwechsel", amount: 480 }]);
  });

  it("keeps distinct positions with different amounts", () => {
    const result = dedupeInvoiceLineItemUnitPrices([
      { label: "Arbeitslohn", amount: 120 },
      { label: "Motoröl", amount: 89 },
    ]);

    expect(result).toHaveLength(2);
  });

  it("removes junk column header rows", () => {
    const result = dedupeInvoiceLineItemUnitPrices([
      { label: "E-Preis", amount: 120 },
      { label: "Ölfilter", amount: 42.9 },
    ]);

    expect(result).toEqual([{ label: "Ölfilter", amount: 42.9 }]);
  });
});
