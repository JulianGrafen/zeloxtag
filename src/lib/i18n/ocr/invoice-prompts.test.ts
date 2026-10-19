import { describe, expect, it } from "vitest";

import {
  buildHybridInvoiceSystemPrompt,
  buildInvoiceHeaderSystemPrompt,
  buildInvoiceVisionSystemPrompt,
} from "@/lib/i18n/ocr/invoice-prompts";

describe("invoice-prompts locale", () => {
  it("DE hybrid prompt mentions KM-Stand", () => {
    expect(buildHybridInvoiceSystemPrompt("de")).toContain("KM-Stand");
  });

  it("EN hybrid prompt mentions USD and odometer", () => {
    const prompt = buildHybridInvoiceSystemPrompt("en");
    expect(prompt).toContain("USD");
    expect(prompt.toLowerCase()).toContain("odometer");
    expect(prompt).toContain("MM/DD/YYYY");
  });

  it("EN vision prompt appends US rules", () => {
    expect(buildInvoiceVisionSystemPrompt("en")).toContain("mileageKm");
  });

  it("EN header prompt uses ISO dates", () => {
    expect(buildInvoiceHeaderSystemPrompt("en")).toContain("YYYY-MM-DD");
  });
});
