import { describe, expect, it } from "vitest";

import {
  normalizeTuevLineItems,
  parseTuevAmountValue,
  resolveTuevTotalAmount,
} from "@/lib/ocr/tuev-amount";

describe("parseTuevAmountValue", () => {
  it("parses German comma decimals", () => {
    expect(parseTuevAmountValue("125,00")).toBe(125);
    expect(parseTuevAmountValue("171,90 EUR")).toBe(171.9);
  });

  it("parses thousand separators", () => {
    expect(parseTuevAmountValue("1.234,56")).toBe(1234.56);
  });
});

describe("resolveTuevTotalAmount", () => {
  it("prefers explicit Gesamt line item", () => {
    expect(
      resolveTuevTotalAmount(123.81, [
        { label: "Hauptuntersuchung", amount: 123.81 },
        { label: "Gesamtbetrag inkl. MwSt", amount: 125 },
      ]),
    ).toBe(125);
  });

  it("sums line items when amount is a partial HU fee", () => {
    expect(
      resolveTuevTotalAmount(123.81, [
        { label: "Hauptuntersuchung", amount: 123.81 },
        { label: "Vorgaben", amount: 1.19 },
      ]),
    ).toBe(125);
  });

  it("sums TÜV Rheinland Entgelt rows", () => {
    expect(
      resolveTuevTotalAmount(null, [
        { label: "Prüfungsentgelt", amount: 165.71 },
        { label: "Vorgaben", amount: 1.19 },
        { label: "Vergütung", amount: 5 },
      ]),
    ).toBe(171.9);
  });

  it("keeps correct total when it matches sum", () => {
    expect(
      resolveTuevTotalAmount(125, [
        { label: "Hauptuntersuchung", amount: 123.81 },
        { label: "Sonstiges", amount: 1.19 },
      ]),
    ).toBe(125);
  });

  it("returns parsed amount when no line items", () => {
    expect(resolveTuevTotalAmount(171.9, null)).toBe(171.9);
  });
});

describe("normalizeTuevLineItems", () => {
  it("normalizes string amounts in line items", () => {
    expect(
      normalizeTuevLineItems([
        { label: "HU", amount: "123,81" },
        { label: "Vorgaben", amount: "1,19" },
      ]),
    ).toEqual([
      { label: "HU", amount: 123.81 },
      { label: "Vorgaben", amount: 1.19 },
    ]);
  });
});
