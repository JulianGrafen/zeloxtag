import { describe, expect, it } from "vitest";

import { OCR_SAMPLES } from "@/lib/ocr/__fixtures__/ocr-samples";
import {
  ensureInvoiceVatAndGrossTotal,
  extractVatAmountFromText,
  isVatLineItem,
} from "@/lib/ocr/invoice-vat";

describe("invoice-vat", () => {
  it("extracts MwSt amount from OCR footer text", () => {
    expect(extractVatAmountFromText(OCR_SAMPLES.workshopInvoiceWithTuevMention)).toBe(
      114,
    );
    expect(extractVatAmountFromText(OCR_SAMPLES.oilChangeInvoice)).toBe(28.98);
  });

  it("appends MwSt line and sets brutto Gesamtbetrag", () => {
    const positions = [
      { label: "Arbeitslohn Sportfedern", amount: 120 },
      { label: "Sportfedern H&R", amount: 480 },
    ];

    const result = ensureInvoiceVatAndGrossTotal({
      lineItems: positions,
      amount: 714,
      ocrText: OCR_SAMPLES.workshopInvoiceWithTuevMention,
    });

    expect(result.amount).toBe(714);
    expect(result.lineItems).toHaveLength(3);
    expect(result.lineItems!.some(isVatLineItem)).toBe(true);
    expect(
      result.lineItems!.find(isVatLineItem)!.amount,
    ).toBe(114);
  });

  it("computes 19% MwSt when no footer text but brutto amount is known", () => {
    const result = ensureInvoiceVatAndGrossTotal({
      lineItems: [{ label: "Bremsbeläge", amount: 100 }],
      amount: 119,
    });

    expect(result.lineItems).toMatchObject([
      { label: "Bremsbeläge", amount: 100 },
      { label: "MwSt 19%", amount: 19 },
    ]);
    expect(result.amount).toBe(119);
  });

  it("does not duplicate MwSt when already present", () => {
    const items = [
      { label: "Ölwechsel", amount: 89 },
      { label: "MwSt 19%", amount: 28.98 },
    ];

    const result = ensureInvoiceVatAndGrossTotal({
      lineItems: items,
      amount: 181.48,
    });

    expect(result.lineItems).toHaveLength(2);
    expect(result.amount).toBe(181.48);
  });

  it("leaves totals unchanged when amount already equals net sum", () => {
    const items = [{ label: "Pauschale", amount: 90 }];

    const result = ensureInvoiceVatAndGrossTotal({
      lineItems: items,
      amount: 90,
    });

    expect(result.lineItems).toEqual(items);
    expect(result.amount).toBe(90);
  });
});
