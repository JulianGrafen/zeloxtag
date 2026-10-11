import { describe, expect, it } from "vitest";

import {
  inferReceiptKindFromText,
  receiptKindForUploadMime,
} from "@/lib/receipt/receipt-kind";

describe("inferReceiptKindFromText", () => {
  it("detects fuel station receipt from liters and brand", () => {
    const result = inferReceiptKindFromText(
      "Shell Tankstelle\nSuper E10\n42,5 L\nLiterpreis 1,89 €/L\nGesamt 80,25 EUR",
    );
    expect(result.kind).toBe("fuel_receipt");
  });

  it("detects workshop invoice from net and positions", () => {
    const result = inferReceiptKindFromText(
      "Werkstatt Müller GmbH\nRechnung 2024-991\nNetto 420,00\nBrutto 499,80\nArbeitszeit 2,5 h",
    );
    expect(result.kind).toBe("workshop_invoice");
  });
});

describe("receiptKindForUploadMime", () => {
  it("forces workshop for PDF uploads", () => {
    expect(
      receiptKindForUploadMime("application/pdf", "fuel_receipt"),
    ).toBe("workshop_invoice");
  });
});
