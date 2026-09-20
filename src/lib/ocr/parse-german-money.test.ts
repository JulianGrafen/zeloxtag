import { describe, expect, it } from "vitest";

import {
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
