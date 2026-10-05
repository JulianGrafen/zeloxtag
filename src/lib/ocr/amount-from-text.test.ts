import { describe, expect, it } from "vitest";

import { preferAmount } from "@/lib/ocr/amount-from-text";
import { lineTotalFromInvoiceRow } from "@/lib/ocr/invoice-line-items-from-text";

describe("preferAmount", () => {
  it("prefers OCR total when structured amount looks 10× shifted", () => {
    const text = "Gesamtbetrag 1 999,0 €";
    expect(preferAmount(199.9, text)).toBe(1999);
  });
});

describe("lineTotalFromInvoiceRow", () => {
  it("reads line totals with one decimal and space thousands", () => {
    const row = lineTotalFromInvoiceRow("Sportauspuff komplett 1 999,0 €");
    expect(row?.amount).toBe(1999);
  });
});
