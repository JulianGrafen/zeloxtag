import { describe, expect, it } from "vitest";

import {
  dedupeInvoiceLineItemUnitPrices,
  isHourlyRateOfLineTotal,
  isJunkInvoiceLineLabel,
  isUnitPriceAmountOfTotal,
} from "@/lib/ocr/invoice-line-item-dedupe";

describe("isJunkInvoiceLineLabel", () => {
  it("treats Gesamt footer as junk, not a position", () => {
    expect(isJunkInvoiceLineLabel("Gesamt")).toBe(true);
    expect(isJunkInvoiceLineLabel("Endpreis")).toBe(true);
    expect(isJunkInvoiceLineLabel("Wasserschlauch")).toBe(false);
  });
});

describe("isUnitPriceAmountOfTotal", () => {
  it("detects qty × unit = total", () => {
    expect(isUnitPriceAmountOfTotal(120, 480)).toBe(true);
    expect(isUnitPriceAmountOfTotal(141.6, 141.6)).toBe(false);
  });

  it("detects fractional multi-qty when unit is smaller than total", () => {
    expect(isUnitPriceAmountOfTotal(50, 90)).toBe(true);
  });
});

describe("isHourlyRateOfLineTotal", () => {
  it("detects Stundenpreis vs Zeilenbetrag for fractional hours", () => {
    expect(isHourlyRateOfLineTotal(90, 81)).toBe(true);
    expect(isHourlyRateOfLineTotal(65.12, 65.12)).toBe(false);
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

  it("keeps Zeilenbetrag when Stundenpreis was duplicated for same label", () => {
    const result = dedupeInvoiceLineItemUnitPrices([
      { label: "Beide Bremsscheiben erneuern (Hinterachse)", amount: 90 },
      { label: "Beide Bremsscheiben erneuern (Hinterachse)", amount: 81 },
    ]);

    expect(result).toEqual([
      { label: "Beide Bremsscheiben erneuern (Hinterachse)", amount: 81 },
    ]);
  });
});
