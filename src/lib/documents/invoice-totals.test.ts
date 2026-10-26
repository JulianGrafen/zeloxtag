import { describe, expect, it } from "vitest";

import {
  formatVatRateLabel,
  resolveInvoiceTotals,
} from "@/lib/documents/invoice-totals";

describe("resolveInvoiceTotals", () => {
  it("treats lines as gross when they sum to the total", () => {
    const result = resolveInvoiceTotals({
      total: 119,
      lineAmounts: [100, 19],
    });

    expect(result).toEqual({
      kind: "gross-lines",
      net: 100,
      vat: 19,
      gross: 119,
      vatRate: 0.19,
    });
  });

  it("treats lines as net when they sum to total / 1.19", () => {
    const result = resolveInvoiceTotals({
      total: 2265.05,
      lineAmounts: [1200, 703.4],
    });

    expect(result).toEqual({
      kind: "net-lines",
      net: 1903.4,
      vat: 361.65,
      gross: 2265.05,
      vatRate: 0.19,
    });
  });

  it("tolerates small OCR rounding drift", () => {
    const result = resolveInvoiceTotals({
      total: 100,
      lineAmounts: [33.33, 33.33, 33.33],
    });

    expect(result?.kind).toBe("gross-lines");
  });

  it("returns unreconciled when neither interpretation matches", () => {
    const result = resolveInvoiceTotals({
      total: 500,
      lineAmounts: [120, 80],
    });

    expect(result).toEqual({ kind: "unreconciled", lineSum: 200, gross: 500 });
  });

  it("returns total-only when there are no line items", () => {
    expect(resolveInvoiceTotals({ total: 89.9, lineAmounts: [] })).toEqual({
      kind: "total-only",
      gross: 89.9,
    });
  });

  it("returns lines-only when the total is missing", () => {
    expect(resolveInvoiceTotals({ total: null, lineAmounts: [10, 5.5] })).toEqual(
      { kind: "lines-only", lineSum: 15.5 },
    );
  });

  it("returns null when there is neither total nor lines", () => {
    expect(resolveInvoiceTotals({ total: undefined, lineAmounts: [] })).toBeNull();
  });

  it("ignores non-finite line amounts", () => {
    const result = resolveInvoiceTotals({
      total: 50,
      lineAmounts: [50, Number.NaN],
    });

    expect(result?.kind).toBe("gross-lines");
  });

  it("supports a custom VAT rate", () => {
    const result = resolveInvoiceTotals({
      total: 107,
      lineAmounts: [100],
      vatRate: 0.07,
    });

    expect(result).toMatchObject({ kind: "net-lines", vat: 7, vatRate: 0.07 });
  });
});

describe("formatVatRateLabel", () => {
  it("renders whole percent", () => {
    expect(formatVatRateLabel(0.19)).toBe("19 %");
  });
});
