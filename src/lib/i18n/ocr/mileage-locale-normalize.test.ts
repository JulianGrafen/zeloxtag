import { describe, expect, it } from "vitest";

import { normalizeInvoiceMileageKmForLocale } from "@/lib/i18n/ocr/mileage-locale-normalize";

describe("normalizeInvoiceMileageKmForLocale", () => {
  it("converts low EN readings as miles", () => {
    expect(normalizeInvoiceMileageKmForLocale(900, "en")).toBe(1448);
  });

  it("leaves DE readings unchanged", () => {
    expect(normalizeInvoiceMileageKmForLocale(900, "de")).toBe(900);
  });

  it("does not convert high EN km values", () => {
    expect(normalizeInvoiceMileageKmForLocale(45000, "en")).toBe(45000);
  });
});
