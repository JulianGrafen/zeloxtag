import { describe, expect, it } from "vitest";

import {
  mergeFields,
  resolveInvoiceMultiPageSource,
  resolveInvoiceScanParts,
  type AnalyzeDocumentResult,
} from "@/lib/ocr/analyze-document-client";

describe("resolveInvoiceScanParts", () => {
  it("uses full parse for every PDF raster page", () => {
    expect(resolveInvoiceScanParts(4, "invoice", "pdf_pages")).toEqual([
      "full",
      "full",
      "full",
      "full",
    ]);
  });

  it("uses overview + positions for photo wizard blocks", () => {
    expect(resolveInvoiceScanParts(3, "invoice", "photo_blocks")).toEqual([
      "overview",
      "positions",
      "positions",
    ]);
  });

  it("uses full for single invoice file", () => {
    expect(resolveInvoiceScanParts(1, "invoice", "photo_blocks")).toEqual([
      "full",
    ]);
  });
});

describe("resolveInvoiceMultiPageSource", () => {
  it("infers pdf_pages from raster file names", () => {
    const files = [
      new File(["a"], "rechnung-seite-1.jpg", { type: "image/jpeg" }),
      new File(["b"], "rechnung-seite-2.jpg", { type: "image/jpeg" }),
    ];
    expect(resolveInvoiceMultiPageSource(files)).toBe("pdf_pages");
  });

  it("prefers explicit source", () => {
    const files = [new File(["a"], "scan.jpg", { type: "image/jpeg" })];
    expect(resolveInvoiceMultiPageSource(files, "photo_blocks")).toBe(
      "photo_blocks",
    );
  });
});

describe("mergeFields", () => {
  it("merges line items from all full-page scans", () => {
    const mk = (
      lineItems: { label: string; amount: number }[],
      amount: number,
    ): AnalyzeDocumentResult => ({
      kind: "invoice",
      documentType: "invoice",
      fields: {
        vendor: "Werkstatt",
        date: "2024-01-15",
        amount,
        category: "repair",
        summary: null,
        lineItems,
        kbaNumber: null,
        vehicleApprovals: null,
        authority: null,
        conditions: null,
        partCategory: null,
        notes: null,
        manufacturer: null,
        invoiceNumber: null,
        mileageKm: null,
      },
      approvalFields: null,
      rawText: "",
      modelId: "test",
    });

    const merged = mergeFields([
      mk([{ label: "Teil A", amount: 100 }], 100),
      mk([{ label: "Teil B", amount: 50 }], 50),
    ]);

    expect(merged.lineItems?.map((item) => item.label)).toEqual([
      "Teil A",
      "Teil B",
    ]);
  });
});
