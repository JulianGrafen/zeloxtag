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
  isGarbageWorkshopLineItems,
  isWorkshopSectionInvoiceText,
  resolveWorkshopLineItems,
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

  it("ignores Art column when LLM copies it into menge with hours as einzelpreis", () => {
    const [item] = processLineItems([
      {
        label: "Motor wird heiß lt. Kunde Thermost wurde erneuert",
        menge: "4",
        einzelpreis: "0,50",
        gesamtpreis: "46,22 €",
      },
    ]);
    expect(item!.gesamtpreis).toBeCloseTo(46.22, 2);
  });

  it("rejects production garbage (Stück labels) in favor of OCR section parser", () => {
    const garbageLlm = [
      { label: "Stück", amount: 169.0 },
      { label: "Stück", amount: 70.83 },
      { label: "Stück", amount: 65.12 },
      { label: "Motor wird heiß lt. Kunde Thermost wurde erneuert", amount: 28.73 },
      { label: "Thermostat und Wasserschlauch erneuern", amount: 23.11 },
      { label: "Endpreis", amount: 41.04 },
    ];

    expect(isGarbageWorkshopLineItems(garbageLlm)).toBe(true);

    const resolved = resolveWorkshopLineItems({
      llmItems: garbageLlm,
      ocrText: SPEEDWORKZ_OCR_TEXT,
    });

    expect(resolved).toHaveLength(8);
    expect(resolved!.reduce((s, i) => s + i.amount, 0)).toBeCloseTo(
      SPEEDWORKZ_NET_SUM,
      2,
    );
  });
});
