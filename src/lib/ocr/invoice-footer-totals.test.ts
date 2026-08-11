import { describe, expect, it } from "vitest";

import { extractInvoiceLineItemsFromText } from "@/lib/ocr/invoice-line-items-from-text";
import { preferInvoiceLineItems } from "@/lib/ocr/invoice-line-items-from-text";
import {
  TM_MOTORSPORT_BAD_LLM_ITEMS,
  TM_MOTORSPORT_EXPECTED_POSITIONS,
  TM_MOTORSPORT_GROSS,
  TM_MOTORSPORT_NET_SUM,
  TM_MOTORSPORT_OCR_TEXT,
  TM_MOTORSPORT_VAT,
} from "@/lib/ocr/fixtures/tm-motorsport-invoice";
import {
  extractGrossTotalFromText,
  extractNetSumFromText,
  isInvoiceFooterSummaryLabel,
  stripInvoiceFooterSummaryRows,
} from "@/lib/ocr/invoice-footer-totals";
import { ensureInvoiceVatAndGrossTotal } from "@/lib/ocr/invoice-vat";
import { realignShiftedInvoiceLineItems } from "@/lib/ocr/invoice-line-item-alignment";

describe("TM motorsport column invoice regression", () => {
  it("extracts footer net and gross totals from OCR", () => {
    expect(extractNetSumFromText(TM_MOTORSPORT_OCR_TEXT)).toBe(
      TM_MOTORSPORT_NET_SUM,
    );
    expect(extractGrossTotalFromText(TM_MOTORSPORT_OCR_TEXT)).toBe(
      TM_MOTORSPORT_GROSS,
    );
  });

  it("extracts both table positions from OCR text", () => {
    const items = extractInvoiceLineItemsFromText(TM_MOTORSPORT_OCR_TEXT);
    expect(items).not.toBeNull();
    expect(items!.length).toBeGreaterThanOrEqual(2);
    expect(items![0]!.amount).toBeCloseTo(149.96, 2);
    expect(items!.some((item) => Math.abs(item.amount - 245.29) < 0.01)).toBe(
      true,
    );
  });

  it("drops footer summary labels misread as positions", () => {
    expect(isInvoiceFooterSummaryLabel("Gesamtbetrag")).toBe(true);
    expect(isInvoiceFooterSummaryLabel("Nettosumme")).toBe(true);

    const stripped = stripInvoiceFooterSummaryRows([...TM_MOTORSPORT_BAD_LLM_ITEMS]);
    expect(stripped).toHaveLength(2);
    expect(stripped!.some((item) => item.label.includes("Gesamtbetrag"))).toBe(
      false,
    );
  });

  it("prefers OCR positions when LLM output misses a row and shifts amounts", () => {
    const ocrItems = extractInvoiceLineItemsFromText(TM_MOTORSPORT_OCR_TEXT)!;
    const merged = preferInvoiceLineItems(
      [...TM_MOTORSPORT_BAD_LLM_ITEMS],
      ocrItems,
    );

    expect(merged!.length).toBeGreaterThanOrEqual(2);
    const sum = merged!.reduce((acc, item) => acc + item.amount, 0);
    expect(sum).toBeCloseTo(TM_MOTORSPORT_NET_SUM, 2);
  });

  it("builds correct review lines with MwSt and gross total", () => {
    const ocrItems = extractInvoiceLineItemsFromText(TM_MOTORSPORT_OCR_TEXT)!;
    const positions = preferInvoiceLineItems(
      stripInvoiceFooterSummaryRows([...TM_MOTORSPORT_BAD_LLM_ITEMS]),
      ocrItems,
    );

    const result = ensureInvoiceVatAndGrossTotal({
      lineItems: positions,
      amount: TM_MOTORSPORT_GROSS,
      ocrText: TM_MOTORSPORT_OCR_TEXT,
    });

    expect(result.amount).toBe(TM_MOTORSPORT_GROSS);
    expect(result.lineItems).toHaveLength(3);
    expect(result.lineItems![0]!.amount).toBeCloseTo(149.96, 2);
    expect(result.lineItems!.some((item) => Math.abs(item.amount - 245.29) < 0.01)).toBe(
      true,
    );
    expect(
      result.lineItems!.find((item) => /mwst/i.test(item.label))!.amount,
    ).toBeCloseTo(TM_MOTORSPORT_VAT, 2);
  });

  it("realigns shifted rows against nettosumme", () => {
    const shifted = [
      {
        label:
          "Änderungsabnahme gemäß §19 Abs. 3 KW V1 Gewindefahrwerk geänd. Rad-/Reifenkombination",
        amount: 149.96,
      },
      {
        label: "Fehlersuche Dynamic Drive System / Kabelverbindungen geprüft und gemessen",
        amount: 245.29,
      },
    ];

    const fixed = realignShiftedInvoiceLineItems(shifted, TM_MOTORSPORT_NET_SUM);
    expect(fixed).toEqual([
      {
        label:
          "Änderungsabnahme gemäß §19 Abs. 3 KW V1 Gewindefahrwerk geänd. Rad-/Reifenkombination",
        amount: 245.29,
      },
      {
        label:
          "Fehlersuche Dynamic Drive System / Kabelverbindungen geprüft und gemessen",
        amount: 149.96,
      },
    ]);
  });
});
