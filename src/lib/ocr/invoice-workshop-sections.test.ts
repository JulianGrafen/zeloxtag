import { describe, expect, it } from "vitest";

import {
  SPEEDWORKZ_EXPECTED_LINE_ITEMS,
  SPEEDWORKZ_GROSS_TOTAL,
  SPEEDWORKZ_LLM_RAW_LINE_ITEMS,
  SPEEDWORKZ_NET_SUM,
  SPEEDWORKZ_OCR_TEXT,
  SPEEDWORKZ_VAT,
} from "@/lib/ocr/fixtures/speedworkz-invoice-line-items";
import { extractInvoiceLineItemsFromText } from "@/lib/ocr/invoice-line-items-from-text";
import {
  extractWorkshopInvoiceAmount,
  extractWorkshopInvoiceVatAmount,
  extractWorkshopSectionLineItems,
  isWorkshopSectionInvoiceText,
} from "@/lib/ocr/invoice-workshop-sections";
import { extractAmountFromText } from "@/lib/ocr/amount-from-text";
import { processLineItems } from "@/utils/invoiceMath";

describe("Speedworkz section invoice", () => {
  it("detects workshop section layout", () => {
    expect(isWorkshopSectionInvoiceText(SPEEDWORKZ_OCR_TEXT)).toBe(true);
  });

  it("extracts all 8 billable positions from OCR text", () => {
    const items = extractWorkshopSectionLineItems(SPEEDWORKZ_OCR_TEXT);
    expect(items).not.toBeNull();
    expect(items!).toHaveLength(8);

    for (let i = 0; i < SPEEDWORKZ_EXPECTED_LINE_ITEMS.length; i += 1) {
      expect(items![i]!.label).toContain(
        SPEEDWORKZ_EXPECTED_LINE_ITEMS[i]!.label.split(" ")[0]!,
      );
      expect(items![i]!.amount).toBeCloseTo(
        SPEEDWORKZ_EXPECTED_LINE_ITEMS[i]!.amount,
        2,
      );
    }

    const sum = items!.reduce((acc, item) => acc + item.amount, 0);
    expect(sum).toBeCloseTo(SPEEDWORKZ_NET_SUM, 2);
  });

  it("skips description-only labor lines without price", () => {
    const items = extractWorkshopSectionLineItems(SPEEDWORKZ_OCR_TEXT)!;
    const labels = items.map((item) => item.label.toLowerCase());
    expect(labels.some((label) => label.includes("thermostat gebrochen"))).toBe(
      false,
    );
    expect(labels.some((label) => label.includes("wasserflansch"))).toBe(false);
  });

  it("extracts Endpreis and MwSt from footer", () => {
    expect(extractWorkshopInvoiceAmount(SPEEDWORKZ_OCR_TEXT)).toBe(
      SPEEDWORKZ_GROSS_TOTAL,
    );
    expect(extractWorkshopInvoiceVatAmount(SPEEDWORKZ_OCR_TEXT)).toBe(
      SPEEDWORKZ_VAT,
    );
    expect(extractAmountFromText(SPEEDWORKZ_OCR_TEXT)).toBe(
      SPEEDWORKZ_GROSS_TOTAL,
    );
  });

  it("uses section parser in extractInvoiceLineItemsFromText fallback", () => {
    const items = extractInvoiceLineItemsFromText(SPEEDWORKZ_OCR_TEXT);
    expect(items).toHaveLength(8);
    expect(items![0]!.amount).toBeCloseTo(46.22, 2);
  });

  it("processes LLM raw strings for Speedworkz layout", () => {
    const processed = processLineItems(SPEEDWORKZ_LLM_RAW_LINE_ITEMS);
    expect(processed).toHaveLength(8);

    for (let i = 0; i < SPEEDWORKZ_EXPECTED_LINE_ITEMS.length; i += 1) {
      expect(processed[i]!.gesamtpreis).toBeCloseTo(
        SPEEDWORKZ_EXPECTED_LINE_ITEMS[i]!.amount,
        2,
      );
    }

    const sum = processed.reduce((acc, row) => acc + row.gesamtpreis, 0);
    expect(sum).toBeCloseTo(SPEEDWORKZ_NET_SUM, 2);
  });
});
