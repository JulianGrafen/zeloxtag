import { describe, expect, it } from "vitest";

import { selectAbeTablePdfPageIndices } from "@/services/documents/IngestionService";

describe("selectAbeTablePdfPageIndices", () => {
  it("returns empty for zero pages", () => {
    expect(selectAbeTablePdfPageIndices(0)).toEqual([]);
  });

  it("returns all pages for documents with up to five pages", () => {
    expect(selectAbeTablePdfPageIndices(1)).toEqual([0]);
    expect(selectAbeTablePdfPageIndices(2)).toEqual([0, 1]);
    expect(selectAbeTablePdfPageIndices(3)).toEqual([0, 1, 2]);
    expect(selectAbeTablePdfPageIndices(5)).toEqual([0, 1, 2, 3, 4]);
  });

  it("adds last two pages without duplicating overlap", () => {
    expect(selectAbeTablePdfPageIndices(6)).toEqual([0, 1, 2, 4, 5]);
    expect(selectAbeTablePdfPageIndices(10)).toEqual([0, 1, 2, 8, 9]);
  });
});

describe("abeVisionExtractionSchemas", () => {
  it("normalizes KBA digits and auflagen codes", async () => {
    const { normalizeAbeVisionExtraction } = await import(
      "@/lib/validations/abeVisionExtractionSchemas"
    );

    expect(
      normalizeAbeVisionExtraction({
        kba_number: "KBA 48571",
        abe_nr: null,
        part_type: " Felge ",
        auflagen: ["a01", "K2B", "a01"],
        confidence_score: 120,
      }),
    ).toEqual({
      kba_number: "48571",
      abe_nr: null,
      part_type: "Felge",
      auflagen: ["A01", "K2B"],
      confidence_score: 100,
    });
  });

  it("detects empty extractions for manual fallback", async () => {
    const {
      emptyAbeVisionExtraction,
      isAbeVisionExtractionEmpty,
    } = await import("@/lib/validations/abeVisionExtractionSchemas");

    expect(isAbeVisionExtractionEmpty(emptyAbeVisionExtraction())).toBe(true);
    expect(
      isAbeVisionExtractionEmpty({
        kba_number: "12345",
        abe_nr: null,
        part_type: null,
        auflagen: [],
        confidence_score: 90,
      }),
    ).toBe(false);
  });
});
