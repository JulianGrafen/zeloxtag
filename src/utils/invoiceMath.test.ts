import { describe, expect, it } from "vitest";

import { parseGermanNumber, processLineItems } from "@/utils/invoiceMath";

// ─── parseGermanNumber ────────────────────────────────────────────────────────

describe("parseGermanNumber", () => {
  describe("German decimal comma formats", () => {
    it("parses '141,46'", () => expect(parseGermanNumber("141,46")).toBe(141.46));
    it("parses '42,90'", () => expect(parseGermanNumber("42,90")).toBe(42.9));
    it("parses '0,50'", () => expect(parseGermanNumber("0,50")).toBe(0.5));
    it("parses '1.234,56' (thousands dot + decimal comma)", () =>
      expect(parseGermanNumber("1.234,56")).toBe(1234.56));
    it("parses '10.000,00'", () => expect(parseGermanNumber("10.000,00")).toBe(10000));
    it("parses '1.000.000,50' (multiple thousands dots)", () =>
      expect(parseGermanNumber("1.000.000,50")).toBe(1000000.5));
  });

  describe("German thousands without decimal", () => {
    it("parses '1.000' as 1000 (3 digits after single dot)", () =>
      expect(parseGermanNumber("1.000")).toBe(1000));
    it("parses '10.000' as 10000", () => expect(parseGermanNumber("10.000")).toBe(10000));
  });

  describe("US/LLM decimal dot (no comma)", () => {
    it("parses '141.60'", () => expect(parseGermanNumber("141.60")).toBe(141.6));
    it("parses '1.5'", () => expect(parseGermanNumber("1.5")).toBe(1.5));
    it("parses '9.99'", () => expect(parseGermanNumber("9.99")).toBe(9.99));
  });

  describe("plain integers", () => {
    it("parses '4'", () => expect(parseGermanNumber("4")).toBe(4));
    it("parses '120'", () => expect(parseGermanNumber("120")).toBe(120));
  });

  describe("embedded non-numeric characters (the core selling point)", () => {
    it("strips trailing '€' and whitespace: '  1.234,56 €  '", () =>
      expect(parseGermanNumber("  1.234,56 €  ")).toBe(1234.56));
    it("strips '€' prefix: '€ 120,00'", () =>
      expect(parseGermanNumber("€ 120,00")).toBe(120));
    it("strips 'Liter' suffix: '7,00 Liter'", () =>
      expect(parseGermanNumber("7,00 Liter")).toBe(7));
    it("strips 'Stk.' suffix: '4 Stk.'", () =>
      expect(parseGermanNumber("4 Stk.")).toBe(4));
    it("strips 'h' (hours) suffix: '3 h'", () =>
      expect(parseGermanNumber("3 h")).toBe(3));
    it("strips 'kg' suffix: '2,5 kg'", () =>
      expect(parseGermanNumber("2,5 kg")).toBe(2.5));
  });

  describe("null / empty / invalid inputs", () => {
    it("returns null for null", () => expect(parseGermanNumber(null)).toBeNull());
    it("returns null for undefined", () => expect(parseGermanNumber(undefined)).toBeNull());
    it("returns null for empty string", () => expect(parseGermanNumber("")).toBeNull());
    it("returns null for whitespace-only", () => expect(parseGermanNumber("   ")).toBeNull());
    it("returns null for lone minus", () => expect(parseGermanNumber("-")).toBeNull());
    it("returns null for letter-only strings", () =>
      expect(parseGermanNumber("abc")).toBeNull());
  });
});

// ─── processLineItems ─────────────────────────────────────────────────────────

describe("processLineItems", () => {
  it("computes total when gesamtpreis is absent", () => {
    expect(
      processLineItems([{ label: "Reifen", menge: "4", einzelpreis: "120,00", gesamtpreis: null }]),
    ).toEqual([{ label: "Reifen", quantity: 4, unitPrice: 120, totalPrice: 480 }]);
  });

  it("defaults menge to 1 when blank and uses einzelpreis as total", () => {
    expect(
      processLineItems([{ label: "Ölfilter", menge: null, einzelpreis: "42,90", gesamtpreis: null }]),
    ).toEqual([{ label: "Ölfilter", quantity: 1, unitPrice: 42.9, totalPrice: 42.9 }]);
  });

  it("trusts gesamtpreis when it matches computed value", () => {
    expect(
      processLineItems([{ label: "Reifen", menge: "4", einzelpreis: "120,00", gesamtpreis: "480,00" }]),
    ).toEqual([{ label: "Reifen", quantity: 4, unitPrice: 120, totalPrice: 480 }]);
  });

  it("overrides wrong gesamtpreis (LLM returned EP instead of GP)", () => {
    const result = processLineItems([
      { label: "Reifen", menge: "4", einzelpreis: "120,00", gesamtpreis: "120,00" },
    ]);
    // computed = 4 × 120 = 480; diff from reported 120 = 360 > 0.05 → use computed
    expect(result).toEqual([{ label: "Reifen", quantity: 4, unitPrice: 120, totalPrice: 480 }]);
  });

  it("keeps gesamtpreis when rounding causes tiny mismatch ≤ €0.05", () => {
    // 3 × 33,33 = 99,99; printed total = 100,00; diff = 0.01 ≤ 0.05 → keep printed
    const result = processLineItems([
      { label: "Pauschale", menge: "3", einzelpreis: "33,33", gesamtpreis: "100,00" },
    ]);
    expect(result).toEqual([{ label: "Pauschale", quantity: 3, unitPrice: 33.33, totalPrice: 100 }]);
  });

  it("uses gesamtpreis directly when einzelpreis is absent", () => {
    expect(
      processLineItems([{ label: "Arbeitslohn", menge: null, einzelpreis: null, gesamtpreis: "95,00" }]),
    ).toEqual([{ label: "Arbeitslohn", quantity: 1, unitPrice: 0, totalPrice: 95 }]);
  });

  it("drops items where both einzelpreis and gesamtpreis are absent", () => {
    expect(
      processLineItems([{ label: "Leere Zeile", menge: null, einzelpreis: null, gesamtpreis: null }]),
    ).toEqual([]);
  });

  it("handles unit text in menge ('7,00 Liter')", () => {
    const result = processLineItems([
      { label: "Motoröl", menge: "7,00 Liter", einzelpreis: "12,50", gesamtpreis: "87,50" },
    ]);
    expect(result).toEqual([{ label: "Motoröl", quantity: 7, unitPrice: 12.5, totalPrice: 87.5 }]);
  });

  it("processes a full workshop invoice table", () => {
    const result = processLineItems([
      { label: "Sportfedern H&R", menge: "4", einzelpreis: "120,00", gesamtpreis: "480,00" },
      { label: "Arbeitslohn",      menge: null, einzelpreis: "95,00", gesamtpreis: "95,00" },
      { label: "Entsorgung",        menge: null, einzelpreis: null,   gesamtpreis: "12,00" },
    ]);
    expect(result).toEqual([
      { label: "Sportfedern H&R", quantity: 4, unitPrice: 120, totalPrice: 480 },
      { label: "Arbeitslohn",     quantity: 1, unitPrice: 95,  totalPrice: 95  },
      { label: "Entsorgung",      quantity: 1, unitPrice: 0,   totalPrice: 12  },
    ]);
  });

  it("silently skips non-object elements", () => {
    expect(processLineItems([null, "string", 42, undefined])).toEqual([]);
  });

  it("handles German thousands prices correctly", () => {
    const result = processLineItems([
      { label: "Turbolader", menge: "1", einzelpreis: "1.234,56", gesamtpreis: "1.234,56" },
    ]);
    expect(result).toEqual([
      { label: "Turbolader", quantity: 1, unitPrice: 1234.56, totalPrice: 1234.56 },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(processLineItems([])).toEqual([]);
  });
});
