import { describe, expect, it } from "vitest";

import {
  coerceGermanMoneyAmount,
  parseGermanMoneyAmount,
  sanitizeLlmMoneyAmount,
} from "@/lib/ocr/parse-german-money";

describe("parseGermanMoneyAmount", () => {
  it("parses standard German decimals", () => {
    expect(parseGermanMoneyAmount("141,60")).toBe(141.6);
    expect(parseGermanMoneyAmount("1.234,56")).toBe(1234.56);
    expect(parseGermanMoneyAmount("428,90")).toBe(428.9);
  });

  it("fixes shifted comma (1416,00 → 141,60)", () => {
    expect(parseGermanMoneyAmount("1416,00")).toBe(141.6);
    expect(parseGermanMoneyAmount("1416.00")).toBe(141.6);
  });

  it("handles ( ↔ 3 OCR confusion in money tokens", () => {
    expect(parseGermanMoneyAmount("(41,60")).toBe(141.6);
    expect(parseGermanMoneyAmount("141,60")).toBe(141.6);
  });

  it("keeps genuine large amounts when no 10× smaller parse exists", () => {
    expect(parseGermanMoneyAmount("2500,00")).toBe(2500);
  });
});

describe("sanitizeLlmMoneyAmount", () => {
  it("corrects numeric LLM comma shift", () => {
    expect(sanitizeLlmMoneyAmount(1416)).toBe(141.6);
    expect(sanitizeLlmMoneyAmount(14160)).toBe(141.6);
  });

  it("leaves correct values unchanged", () => {
    expect(sanitizeLlmMoneyAmount(141.6)).toBe(141.6);
    expect(sanitizeLlmMoneyAmount(2500)).toBe(2500);
  });
});

describe("coerceGermanMoneyAmount", () => {
  it("coerces strings and numbers consistently", () => {
    expect(coerceGermanMoneyAmount("141,60")).toBe(141.6);
    expect(coerceGermanMoneyAmount(1416)).toBe(141.6);
    expect(coerceGermanMoneyAmount("15%")).toBeNull();
  });
});
