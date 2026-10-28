import { describe, expect, it } from "vitest";

import {
  formatCurrencyEUR,
  formatDateDE,
  formatInvoiceNumber,
  formatInvoicePositionLabel,
  formatLineItemLabel,
  formatMileageKm,
  restoreGermanUmlauts,
} from "@/utils/formatters";

describe("formatCurrencyEUR", () => {
  it("formats euros with German separators", () => {
    expect(formatCurrencyEUR(2265.05)).toBe("2.265,05\u00a0€");
  });

  it("returns a dash for missing or invalid values", () => {
    expect(formatCurrencyEUR(null)).toBe("—");
    expect(formatCurrencyEUR(undefined)).toBe("—");
    expect(formatCurrencyEUR(Number.NaN)).toBe("—");
  });
});

describe("formatMileageKm", () => {
  it("adds thousand separators and unit", () => {
    expect(formatMileageKm(302400)).toBe("302.400 km");
  });

  it("rounds fractional kilometres", () => {
    expect(formatMileageKm(1234.6)).toBe("1.235 km");
  });

  it("returns null for unknown or negative values", () => {
    expect(formatMileageKm(null)).toBeNull();
    expect(formatMileageKm(-1)).toBeNull();
  });
});

describe("formatDateDE", () => {
  it("formats ISO dates as dd.mm.yyyy", () => {
    expect(formatDateDE("2026-09-23")).toBe("23.09.2026");
  });

  it("returns null for empty input", () => {
    expect(formatDateDE(null)).toBeNull();
    expect(formatDateDE("  ")).toBeNull();
  });
});

describe("formatInvoiceNumber", () => {
  it("trims and collapses whitespace", () => {
    expect(formatInvoiceNumber("  AS-2026  0923 ")).toBe("AS-2026 0923");
  });

  it("returns null for empty input", () => {
    expect(formatInvoiceNumber("")).toBeNull();
    expect(formatInvoiceNumber(null)).toBeNull();
  });
});

describe("restoreGermanUmlauts", () => {
  it.each([
    ["Bremsfluessigkeit", "Bremsflüssigkeit"],
    ["Kältemittel R134a nachfuellen 450 g", "Kältemittel R134a nachfüllen 450 g"],
    ["Motoroel 5W-30", "Motoröl 5W-30"],
    ["Oelfilter", "Ölfilter"],
    ["Zuendkerzen", "Zündkerzen"],
    ["Stossdaempfer hinten", "Stossdämpfer hinten"],
    ["Kuehlmittel", "Kühlmittel"],
    ["Entsorgungsgebuehr", "Entsorgungsgebühr"],
    ["Ueberpruefung", "Überprüfung"],
    ["Bremsbelaege", "Bremsbeläge"],
    ["Arbeit fuer Fahrwerk", "Arbeit für Fahrwerk"],
    ["OELWECHSEL", "ÖLWECHSEL"],
  ])("restores %s", (input, expected) => {
    expect(restoreGermanUmlauts(input)).toBe(expected);
  });

  it.each(["Steuer", "neue Reifen", "Feuerlöscher", "Queue", "Noel", "Poel", "Refuelling stop"])(
    "leaves %s untouched",
    (input) => {
      expect(restoreGermanUmlauts(input)).toBe(input);
    },
  );

  it("keeps correctly spelled words", () => {
    expect(restoreGermanUmlauts("Bremsflüssigkeit")).toBe("Bremsflüssigkeit");
  });
});

describe("formatLineItemLabel", () => {
  it("strips trailing qty/price glue and restores umlauts", () => {
    expect(formatLineItemLabel("Bremsfluessigkeit DOT4  1,00 38,50")).toBe(
      "Bremsflüssigkeit DOT4",
    );
  });
});

describe("formatInvoicePositionLabel", () => {
  it("keeps the full position text including quantity and price tails", () => {
    expect(
      formatInvoicePositionLabel("Bremsfluessigkeit DOT4  1,00 38,50"),
    ).toBe("Bremsflüssigkeit DOT4 1,00 38,50");
  });

  it("joins multiline OCR with a middle dot", () => {
    expect(formatInvoicePositionLabel("Ölfilter\nwechseln")).toBe(
      "Ölfilter · wechseln",
    );
  });
});
