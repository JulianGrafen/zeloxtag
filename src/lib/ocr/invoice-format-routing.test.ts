import { describe, expect, it } from "vitest";

import { SPEEDWORKZ_OCR_TEXT } from "@/lib/ocr/fixtures/speedworkz-invoice-line-items";
import {
  detectInvoiceTableFormat,
  shouldDrawInvoiceRowSeparators,
  shouldMergeAzureLayout,
} from "@/lib/ocr/invoice-format-routing";

describe("invoice format routing", () => {
  it("detects Speedworkz section layout from OCR text", () => {
    expect(detectInvoiceTableFormat(SPEEDWORKZ_OCR_TEXT)).toBe("workshop-sections");
  });

  it("defaults to column format for standard tables", () => {
    expect(
      detectInvoiceTableFormat("Pos Bezeichnung Menge E-Preis Ges. Preis\n1 Ölfilter 1 42,90 42,90"),
    ).toBe("column");
  });

  it("skips layout merge and row separators for workshop format", () => {
    expect(shouldMergeAzureLayout("workshop-sections")).toBe(false);
    expect(shouldDrawInvoiceRowSeparators("workshop-sections")).toBe(false);
    expect(shouldMergeAzureLayout("column")).toBe(true);
    expect(shouldDrawInvoiceRowSeparators("column")).toBe(true);
  });
});
