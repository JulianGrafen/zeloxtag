import { describe, expect, it } from "vitest";

import { selectAbePdfPageIndices } from "@/services/documents/IngestionService";

describe("selectAbePdfPageIndices", () => {
  it("returns empty for zero pages", () => {
    expect(selectAbePdfPageIndices(0)).toEqual([]);
  });

  it("returns all pages for documents with up to three pages", () => {
    expect(selectAbePdfPageIndices(1)).toEqual([0]);
    expect(selectAbePdfPageIndices(2)).toEqual([0, 1]);
    expect(selectAbePdfPageIndices(3)).toEqual([0, 1, 2]);
  });

  it("adds last two pages without duplicating overlap", () => {
    expect(selectAbePdfPageIndices(4)).toEqual([0, 1, 2, 3]);
    expect(selectAbePdfPageIndices(5)).toEqual([0, 1, 2, 3, 4]);
    expect(selectAbePdfPageIndices(6)).toEqual([0, 1, 2, 4, 5]);
    expect(selectAbePdfPageIndices(10)).toEqual([0, 1, 2, 8, 9]);
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
        part_type: " Felge ",
        auflagen: ["a01", "K2B", "a01"],
        confidence_score: 120,
      }),
    ).toEqual({
      kba_number: "48571",
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
        part_type: null,
        auflagen: [],
        confidence_score: 90,
      }),
    ).toBe(false);
  });
});
