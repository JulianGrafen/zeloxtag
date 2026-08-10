import { describe, expect, it } from "vitest";

import { SPEEDWORKZ_OCR_TEXT } from "@/lib/ocr/fixtures/speedworkz-invoice-line-items";
import {
  detectInvoiceTableFormat,
  isColumnTableInvoiceText,
  shouldDrawInvoiceRowSeparators,
  shouldMergeAzureLayout,
  shouldRealignLineItems,
  shouldReconcileWithOcrHeuristics,
} from "@/lib/ocr/invoice-format-routing";

describe("invoice format routing", () => {
  it("detects Speedworkz section layout from OCR text", () => {
    expect(detectInvoiceTableFormat(SPEEDWORKZ_OCR_TEXT)).toBe("workshop-sections");
  });

  it("detects column format for standard tables", () => {
    const text =
      "Pos Bezeichnung Menge E-Preis Ges. Preis\n1 Ölfilter 1 42,90 42,90";
    expect(isColumnTableInvoiceText(text)).toBe(true);
    expect(detectInvoiceTableFormat(text)).toBe("column");
  });

  it("routes unknown layouts to LLM-only (no regex/layout merge)", () => {
    expect(detectInvoiceTableFormat("")).toBe("unknown");
    expect(detectInvoiceTableFormat("Rechnung Werkstatt Müller\nDatum 01.01.2026")).toBe(
      "unknown",
    );

    expect(shouldMergeAzureLayout("unknown")).toBe(false);
    expect(shouldDrawInvoiceRowSeparators("unknown")).toBe(false);
    expect(shouldReconcileWithOcrHeuristics("unknown")).toBe(false);
    expect(shouldRealignLineItems("unknown")).toBe(false);
  });

  it("skips layout merge and row separators for workshop format", () => {
    expect(shouldMergeAzureLayout("workshop-sections")).toBe(false);
    expect(shouldDrawInvoiceRowSeparators("workshop-sections")).toBe(false);
    expect(shouldMergeAzureLayout("column")).toBe(true);
    expect(shouldDrawInvoiceRowSeparators("column")).toBe(true);
  });
});
