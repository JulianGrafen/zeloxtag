import { describe, expect, it } from "vitest";

import {
  amountsMatchQtyTimesUnit,
  parseInvoiceQuantityCell,
  resolveInvoiceLineTotalAmount,
} from "@/lib/ocr/invoice-line-total";

describe("parseInvoiceQuantityCell", () => {
  it("parses integer quantities", () => {
    expect(parseInvoiceQuantityCell("4")).toBe(4);
    expect(parseInvoiceQuantityCell("1")).toBe(1);
  });

  it("rejects money-like values", () => {
    expect(parseInvoiceQuantityCell("120,00")).toBeNull();
  });
});

describe("amountsMatchQtyTimesUnit", () => {
  it("validates qty × unit = total", () => {
    expect(amountsMatchQtyTimesUnit(4, 120, 480)).toBe(true);
    expect(amountsMatchQtyTimesUnit(1, 95, 95)).toBe(true);
  });
});

describe("resolveInvoiceLineTotalAmount", () => {
  it("returns Menge × E-Preis when both are present", () => {
    expect(
      resolveInvoiceLineTotalAmount({
        quantity: 4,
        unitPrice: 120,
        statedTotal: 480,
      }),
    ).toBe(480);
  });

  it("upgrades stated E-Preis to Ges. Preis via qty × EP", () => {
    expect(
      resolveInvoiceLineTotalAmount({
        quantity: 4,
        unitPrice: 120,
        statedTotal: 120,
      }),
    ).toBe(480);
  });

  it("computes total when only qty and E-Preis exist", () => {
    expect(
      resolveInvoiceLineTotalAmount({
        quantity: 4,
        unitPrice: 120,
        statedTotal: null,
      }),
    ).toBe(480);
  });

  it("uses Ges. Preis when Menge is empty", () => {
    expect(
      resolveInvoiceLineTotalAmount({
        quantity: null,
        unitPrice: 120,
        statedTotal: 480,
      }),
    ).toBe(480);
  });

  it("falls back to E-Preis when Menge and Ges. Preis are empty", () => {
    expect(
      resolveInvoiceLineTotalAmount({
        quantity: null,
        unitPrice: 42.9,
        statedTotal: null,
      }),
    ).toBe(42.9);
  });

  it("uses single price when qty is 1", () => {
    expect(
      resolveInvoiceLineTotalAmount({
        quantity: 1,
        unitPrice: 95,
        statedTotal: 95,
      }),
    ).toBe(95);
  });
});
