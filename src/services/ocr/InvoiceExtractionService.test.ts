import { describe, expect, it } from "vitest";

import { mergeInvoiceWizardExtractions } from "@/services/ocr/InvoiceExtractionService";

describe("mergeInvoiceWizardExtractions", () => {
  it("uses dedicated line-items scan as sole lineItems source", () => {
    const merged = mergeInvoiceWizardExtractions(
      {
        vendor: "Overview Werkstatt",
        date: "2026-01-01",
        amount: 999,
        category: "other",
        summary: "Tuning",
      },
      {
        vendor: "Header Werkstatt",
        invoiceNumber: "RE-1",
        mileageKm: 120_000,
        date: "2026-02-02",
      },
      {
        lineItems: [
          { label: "Sportfedern", amount: 320 },
          { label: "Arbeitslohn", amount: 180 },
        ],
        amount: 500,
      },
    );

    expect(merged.vendor).toBe("Header Werkstatt");
    expect(merged.date).toBe("2026-02-02");
    expect(merged.invoiceNumber).toBe("RE-1");
    expect(merged.mileageKm).toBe(120_000);
    expect(merged.lineItems).toEqual([
      { label: "Sportfedern", amount: 320 },
      { label: "Arbeitslohn", amount: 180 },
    ]);
    expect(merged.amount).toBe(500);
  });

  it("respects locked category from scan picker", () => {
    const merged = mergeInvoiceWizardExtractions(
      null,
      {
        vendor: "Werkstatt",
        invoiceNumber: null,
        mileageKm: null,
        date: null,
      },
      {
        lineItems: [{ label: "Bremsen", amount: 90 }],
        amount: 90,
      },
      { lockedCategory: "repair" },
    );

    expect(merged.category).toBe("repair");
  });
});
