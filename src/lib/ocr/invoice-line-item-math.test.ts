import { describe, expect, it } from "vitest";

import {
  computeLineItemTotal,
  parseAndVerifyLineItems,
  parseGermanNumber,
} from "@/lib/ocr/invoice-line-item-math";

// ─── parseGermanNumber ────────────────────────────────────────────────────────

describe("parseGermanNumber", () => {
  describe("German decimal formats", () => {
    it("parses comma-decimal 'Xxx,xx'", () => {
      expect(parseGermanNumber("141,46")).toBe(141.46);
      expect(parseGermanNumber("42,90")).toBe(42.9);
      expect(parseGermanNumber("0,50")).toBe(0.5);
    });

    it("parses German thousands-dot + decimal-comma '1.234,56'", () => {
      expect(parseGermanNumber("1.234,56")).toBe(1234.56);
      expect(parseGermanNumber("10.000,00")).toBe(10000);
      expect(parseGermanNumber("1.234.567,89")).toBe(1234567.89);
    });

    it("parses German thousands-dot without decimal '1.000'", () => {
      expect(parseGermanNumber("1.000")).toBe(1000);
      expect(parseGermanNumber("10.000")).toBe(10000);
    });
  });

  describe("LLM US-style decimal", () => {
    it("parses US-style decimal dot '141.60'", () => {
      expect(parseGermanNumber("141.60")).toBe(141.6);
      expect(parseGermanNumber("1.5")).toBe(1.5);
    });
  });

  describe("plain integers", () => {
    it("parses plain integers", () => {
      expect(parseGermanNumber("4")).toBe(4);
      expect(parseGermanNumber("120")).toBe(120);
      expect(parseGermanNumber("1")).toBe(1);
    });
  });

  describe("trailing unit text stripping", () => {
    it("strips trailing unit text", () => {
      expect(parseGermanNumber("7,00 Liter")).toBe(7);
      expect(parseGermanNumber("4 Stk.")).toBe(4);
      expect(parseGermanNumber("3 h")).toBe(3);
      expect(parseGermanNumber("2,5 kg")).toBe(2.5);
      expect(parseGermanNumber("120,00 €")).toBe(120);
    });
  });

  describe("null / empty / invalid inputs", () => {
    it("returns null for null", () => expect(parseGermanNumber(null)).toBeNull());
    it("returns null for empty string", () => expect(parseGermanNumber("")).toBeNull());
    it("returns null for whitespace", () => expect(parseGermanNumber("  ")).toBeNull());
    it("returns null for dash placeholder", () => expect(parseGermanNumber("-")).toBeNull());
    it("returns null for percent-only strings", () => expect(parseGermanNumber("19%")).toBeNull()); // guard in utils/invoiceMath
    it("returns null for undefined", () => expect(parseGermanNumber(undefined)).toBeNull());
  });

  describe("currency symbol stripping", () => {
    it("strips € symbol", () => expect(parseGermanNumber("€ 120,00")).toBe(120));
    it("strips $ symbol", () => expect(parseGermanNumber("$9.99")).toBe(9.99));
  });
});

// ─── computeLineItemTotal ─────────────────────────────────────────────────────

describe("computeLineItemTotal", () => {
  it("uses Ges. Preis directly when Einzelpreis is absent", () => {
    expect(
      computeLineItemTotal({
        label: "Arbeitslohn",
        menge: null,
        einzelpreis: null,
        gesamtpreis: "95,00",
      }),
    ).toEqual({ label: "Arbeitslohn", amount: 95 });
  });

  it("computes total from menge × einzelpreis when gesamtpreis is absent", () => {
    expect(
      computeLineItemTotal({
        label: "Reifen",
        menge: "4",
        einzelpreis: "120,00",
        gesamtpreis: null,
      }),
    ).toEqual({ label: "Reifen", amount: 480 });
  });

  it("defaults menge to 1 when blank and computes from einzelpreis", () => {
    expect(
      computeLineItemTotal({
        label: "Ölfilter",
        menge: null,
        einzelpreis: "42,90",
        gesamtpreis: null,
      }),
    ).toEqual({ label: "Ölfilter", amount: 42.9 });
  });

  it("trusts gesamtpreis when it matches menge × einzelpreis", () => {
    expect(
      computeLineItemTotal({
        label: "Reifen",
        menge: "4",
        einzelpreis: "120,00",
        gesamtpreis: "480,00",
      }),
    ).toEqual({ label: "Reifen", amount: 480 });
  });

  it("overrides wrong gesamtpreis (Einzelpreis misread) with computed value", () => {
    expect(
      computeLineItemTotal({
        label: "Reifen",
        menge: "4",
        einzelpreis: "120,00",
        gesamtpreis: "120,00", // LLM returned EP instead of GP
      }),
    ).toEqual({ label: "Reifen", amount: 480 });
  });

  it("keeps gesamtpreis when rounding causes tiny mismatch", () => {
    // 3 × 33,33 = 99,99, but invoice shows 100,00 (rounded up).
    const result = computeLineItemTotal({
      label: "Werkzeugpauschale",
      menge: "3",
      einzelpreis: "33,33",
      gesamtpreis: "100,00",
    });
    // 3 × 33.33 = 99.99, diff = 0.01 → within tolerance → keep 100.00
    expect(result).toEqual({ label: "Werkzeugpauschale", amount: 100 });
  });

  it("returns null when both einzelpreis and gesamtpreis are absent", () => {
    expect(
      computeLineItemTotal({
        label: "Leere Zeile",
        menge: null,
        einzelpreis: null,
        gesamtpreis: null,
      }),
    ).toBeNull();
  });

  it("handles trailing unit text in menge field", () => {
    expect(
      computeLineItemTotal({
        label: "Motoröl",
        menge: "7,00 Liter",
        einzelpreis: "12,50",
        gesamtpreis: "87,50",
      }),
    ).toEqual({ label: "Motoröl", amount: 87.5 });
  });

  it("handles missing menge field (undefined)", () => {
    expect(
      computeLineItemTotal({
        label: "Entsorgungsgebühr",
        einzelpreis: "15,00",
        gesamtpreis: null,
      }),
    ).toEqual({ label: "Entsorgungsgebühr", amount: 15 });
  });
});

// ─── parseAndVerifyLineItems ──────────────────────────────────────────────────

describe("parseAndVerifyLineItems", () => {
  it("processes a typical workshop invoice table", () => {
    const result = parseAndVerifyLineItems([
      { label: "Sportfedern H&R", menge: "4", einzelpreis: "120,00", gesamtpreis: "480,00" },
      { label: "Arbeitslohn", menge: null, einzelpreis: "95,00", gesamtpreis: "95,00" },
      { label: "Entsorgung", menge: null, einzelpreis: null, gesamtpreis: "12,00" },
    ]);

    expect(result).toEqual([
      { label: "Sportfedern H&R", amount: 480 },
      { label: "Arbeitslohn", amount: 95 },
      { label: "Entsorgung", amount: 12 },
    ]);
  });

  it("drops items with no price data and keeps valid ones", () => {
    const result = parseAndVerifyLineItems([
      { label: "Valide Position", menge: null, einzelpreis: "50,00", gesamtpreis: null },
      { label: "Leere Zeile", menge: null, einzelpreis: null, gesamtpreis: null },
    ]);

    expect(result).toEqual([{ label: "Valide Position", amount: 50 }]);
  });

  it("corrects LLM hallucination where gesamtpreis = einzelpreis (forgot menge)", () => {
    const result = parseAndVerifyLineItems([
      // LLM reported Einzelpreis as Ges. Preis, but Menge is 4
      { label: "Bremsbeläge", menge: "4", einzelpreis: "38,50", gesamtpreis: "38,50" },
    ]);

    expect(result).toEqual([{ label: "Bremsbeläge", amount: 154 }]);
  });

  it("returns empty array for empty input", () => {
    expect(parseAndVerifyLineItems([])).toEqual([]);
  });

  it("handles all-null price rows gracefully", () => {
    expect(
      parseAndVerifyLineItems([
        { label: "Nur Text ohne Preis", menge: null, einzelpreis: null, gesamtpreis: null },
      ]),
    ).toEqual([]);
  });

  it("handles German thousands format in prices", () => {
    const result = parseAndVerifyLineItems([
      { label: "Kompressor", menge: "1", einzelpreis: "1.234,56", gesamtpreis: "1.234,56" },
    ]);
    expect(result).toEqual([{ label: "Kompressor", amount: 1234.56 }]);
  });
});
