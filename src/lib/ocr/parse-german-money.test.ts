import { describe, expect, it } from "vitest";

import {
  coerceGermanMoneyAmount,
  inSignedInvoiceLineAmountRange,
  parseGermanMoneyAmount,
} from "@/lib/ocr/parse-german-money";

describe("parseGermanMoneyAmount", () => {
  it("parses positive German amounts (regression)", () => {
    expect(parseGermanMoneyAmount("141,46")).toBe(141.46);
    expect(parseGermanMoneyAmount("141,46 €")).toBe(141.46);
  });

  it("parses negative line amounts (Rabatt / Aktionspreis)", () => {
    expect(parseGermanMoneyAmount("-596,00")).toBe(-596);
    expect(parseGermanMoneyAmount("-596,00 €")).toBe(-596);
  });

  it("rejects zero and out-of-range magnitudes", () => {
    expect(parseGermanMoneyAmount("0,00")).toBeNull();
    expect(parseGermanMoneyAmount("-0,00")).toBeNull();
  });

  it("keeps 4-digit totals without thousand separators (no false comma shift)", () => {
    expect(parseGermanMoneyAmount("1999")).toBe(1999);
    expect(parseGermanMoneyAmount("1999,0")).toBe(1999);
    expect(parseGermanMoneyAmount("1 999,0")).toBe(1999);
    expect(parseGermanMoneyAmount("1.999,00")).toBe(1999);
  });

  it("still corrects ,00 comma-shift misreads", () => {
    expect(parseGermanMoneyAmount("1416,00")).toBe(141.6);
  });
});

describe("coerceGermanMoneyAmount", () => {
  it("does not shrink conservative invoice totals by 10×", () => {
    expect(coerceGermanMoneyAmount(1999, "conservative")).toBe(1999);
  });
});

describe("inSignedInvoiceLineAmountRange", () => {
  it("allows negative position totals", () => {
    expect(inSignedInvoiceLineAmountRange(-596)).toBe(true);
    expect(inSignedInvoiceLineAmountRange(596)).toBe(true);
  });

  it("rejects zero", () => {
    expect(inSignedInvoiceLineAmountRange(0)).toBe(false);
  });
});
