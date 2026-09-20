import { describe, expect, it } from "vitest";

import { OCR_SAMPLES } from "@/lib/ocr/__fixtures__/ocr-samples";
import {
  ensureInvoiceVatAndGrossTotal,
  extractVatAmountFromText,
  isVatLineItem,
  recalculateInvoiceGrossAmount,
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

  it("does not synthesize MwSt when only brutto hint is known", () => {
    const result = ensureInvoiceVatAndGrossTotal({
      lineItems: [{ label: "Bremsbeläge", amount: 100 }],
      amount: 119,
    });

    expect(result.lineItems).toEqual([{ label: "Bremsbeläge", amount: 100 }]);
    expect(result.lineItems!.some(isVatLineItem)).toBe(false);
    expect(result.amount).toBe(119);
  });

  it("keeps positions and brutto hint when OCR has no MwSt line", () => {
    const result = ensureInvoiceVatAndGrossTotal({
      lineItems: [
        { label: "Arbeitslohn", amount: 80 },
        { label: "Material", amount: 20 },
      ],
      amount: 119,
      ocrText: "Gesamtbetrag 119,00 €",
    });

    expect(result.lineItems).toHaveLength(2);
    expect(result.lineItems!.some(isVatLineItem)).toBe(false);
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

  it("dedupes duplicate MwSt rows from multi-block merges", () => {
    const result = ensureInvoiceVatAndGrossTotal({
      lineItems: [
        { label: "Bremsbeläge", amount: 100 },
        { label: "Arbeitslohn", amount: 50 },
        { label: "MwSt 19%", amount: 28.5 },
        { label: "MwSt 19%", amount: 28.5 },
      ],
      amount: 178.5,
    });

    expect(result.lineItems).toHaveLength(3);
    expect(result.lineItems!.filter(isVatLineItem)).toHaveLength(1);
    expect(result.lineItems!.find(isVatLineItem)!.amount).toBe(28.5);
    expect(result.amount).toBe(178.5);
  });

  it("subtracts negative Aktionspreis when LLM brutto is too high", () => {
    const positions = [
      { label: "Tieferlegung Komplett", amount: 1575 },
      { label: "Aktionspreis Tieferlegung", amount: -596 },
    ];
    const ocrText = [
      "Nettosumme 979,00 €",
      "MwSt 19% 186,01 €",
      "Gesamtbetrag 1.165,01 €",
    ].join("\n");

    const result = ensureInvoiceVatAndGrossTotal({
      lineItems: positions,
      amount: 1876.25,
      ocrText,
    });

    expect(result.amount).toBeCloseTo(1165.01, 2);
    expect(result.lineItems!.find(isVatLineItem)!.amount).toBeCloseTo(186.01, 2);
  });

  it("recalculateInvoiceGrossAmount without OCR never injects MwSt", () => {
    expect(
      recalculateInvoiceGrossAmount([{ label: "Bremsbeläge", amount: 100 }], {
        hintAmount: 119,
      }),
    ).toBe(119);
    expect(
      recalculateInvoiceGrossAmount(
        [
          { label: "Ölwechsel", amount: 89 },
          { label: "MwSt 19%", amount: 16.91 },
        ],
        { hintAmount: 105.91 },
      ),
    ).toBe(105.91);
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
