import { describe, expect, it } from "vitest";

import { BLOTZHEIM_27327_OCR_TEXT } from "@/lib/ocr/fixtures/blotzheim-27327-invoice";
import { DMS_SECTION_CAMERA_OCR_TEXT } from "@/lib/ocr/fixtures/dms-section-invoice";
import {
  SPEEDWORKZ_CAMERA_OCR_TEXT,
  SPEEDWORKZ_OCR_TEXT,
} from "@/lib/ocr/fixtures/speedworkz-invoice-line-items";
import {
  detectInvoiceTableFormat,
  isColumnTableInvoiceText,
  shouldDrawInvoiceRowSeparators,
  shouldMergeAzureLayout,
  shouldMergeContinuationLineItems,
  shouldRealignLineItems,
  shouldReconcileWithOcrHeuristics,
} from "@/lib/ocr/invoice-format-routing";

describe("invoice format routing", () => {
  it("detects Speedworkz section layout from OCR text", () => {
    expect(detectInvoiceTableFormat(SPEEDWORKZ_OCR_TEXT)).toBe("workshop-sections");
    expect(detectInvoiceTableFormat(SPEEDWORKZ_CAMERA_OCR_TEXT)).toBe(
      "workshop-sections",
    );
    expect(shouldDrawInvoiceRowSeparators("workshop-sections")).toBe(false);
  });

  it("routes column format from table headers, not vendor or product names", () => {
    expect(detectInvoiceTableFormat(BLOTZHEIM_27327_OCR_TEXT)).toBe("column");

    const withoutVendor = BLOTZHEIM_27327_OCR_TEXT.replace(
      /KFZ Service Blotzheim/gi,
      "Werkstatt XY",
    );
    expect(detectInvoiceTableFormat(withoutVendor)).toBe("column");

    expect(
      detectInvoiceTableFormat(
        "Bremsscheibe PRO+\nBeide Bremsscheiben erneuern\n331,98 €",
      ),
    ).toBe("unknown");
  });

  it("detects column format for standard tables", () => {
    const text =
      "Pos Bezeichnung Menge E-Preis Ges. Preis\n1 Ölfilter 1 42,90 42,90";
    expect(isColumnTableInvoiceText(text)).toBe(true);
    expect(detectInvoiceTableFormat(text)).toBe("column");
  });

  it("defaults empty OCR to column prompts for camera-only scans", () => {
    expect(detectInvoiceTableFormat("")).toBe("column");
    expect(shouldMergeAzureLayout("column")).toBe(true);
  });

  it("routes unrecognized text to LLM-only (no layout merge)", () => {
    expect(detectInvoiceTableFormat("Rechnung Werkstatt Müller\nDatum 01.01.2026")).toBe(
      "unknown",
    );

    expect(shouldMergeAzureLayout("unknown")).toBe(false);
    expect(shouldDrawInvoiceRowSeparators("unknown")).toBe(false);
    expect(shouldReconcileWithOcrHeuristics("unknown")).toBe(true);
    expect(shouldRealignLineItems("unknown")).toBe(false);
  });

  it("draws row separators only for column tables", () => {
    expect(shouldMergeAzureLayout("workshop-sections")).toBe(false);
    expect(shouldDrawInvoiceRowSeparators("workshop-sections")).toBe(false);
    expect(shouldMergeAzureLayout("column")).toBe(true);
    expect(shouldDrawInvoiceRowSeparators("column")).toBe(true);
    expect(shouldDrawInvoiceRowSeparators("unknown")).toBe(false);
  });

  it("still routes Speedworkz without the Arbeitswerte header", () => {
    const withoutLaborHeader = SPEEDWORKZ_OCR_TEXT.replace(
      /^Arbeitswerte\n/m,
      "",
    );
    expect(detectInvoiceTableFormat(withoutLaborHeader)).toBe(
      "workshop-sections",
    );
  });

  it("routes partial OCR with Einzelpreis + Ersatzteile + Positionssumme as workshop", () => {
    const partial = [
      "Beschreibung Rab. % Art PG Std. Preis-€",
      "Anzahl Einheit Beschreibung Einzelpreis Preis-€",
      "Ersatzteile",
      "1 Stück Wasserschlauch 65,12 65,12",
      "Positionssumme 454,49",
    ].join("\n");

    expect(detectInvoiceTableFormat(partial)).toBe("workshop-sections");
  });

  it("routes Arbeitszeit/Material/Fremdleistungen camera OCR as workshop-sections", () => {
    expect(detectInvoiceTableFormat(DMS_SECTION_CAMERA_OCR_TEXT)).toBe(
      "workshop-sections",
    );
    expect(shouldDrawInvoiceRowSeparators("workshop-sections")).toBe(false);
  });

  it("merges wrapped descriptions only for column tables", () => {
    expect(shouldMergeContinuationLineItems("column")).toBe(true);
    expect(shouldMergeContinuationLineItems("workshop-sections")).toBe(false);
    expect(shouldMergeContinuationLineItems("unknown")).toBe(false);
  });
});
