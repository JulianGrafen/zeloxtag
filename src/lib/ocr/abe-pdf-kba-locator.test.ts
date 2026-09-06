import { describe, expect, it } from "vitest";

import {
  findKbaMatchesInPageTexts,
  selectVisionPagesForKbaHits,
} from "@/lib/ocr/abe-pdf-kba-locator";

describe("findKbaMatchesInPageTexts", () => {
  it("finds KBA digits on matching pages", () => {
    const result = findKbaMatchesInPageTexts([
      "Allgemeine Betriebserlaubnis",
      "KBA 48571 Felge",
      "Verwendungsbereich",
    ]);

    expect(result.kbaPageIndices).toEqual([1]);
    expect(result.kbaDigits).toBe("48571");
  });

  it("returns null KBA when no text match exists", () => {
    const result = findKbaMatchesInPageTexts(["Felge 8.5J", ""]);
    expect(result.kbaPageIndices).toEqual([]);
    expect(result.kbaDigits).toBeNull();
  });
});

describe("selectVisionPagesForKbaHits", () => {
  it("selects match page and ±1 neighbors capped at three pages", () => {
    expect(selectVisionPagesForKbaHits([4], 10)).toEqual([3, 4, 5]);
  });

  it("falls back to first page when no KBA text was found", () => {
    expect(selectVisionPagesForKbaHits([], 12)).toEqual([0]);
  });

  it("deduplicates overlapping windows", () => {
    expect(selectVisionPagesForKbaHits([1, 2], 8)).toEqual([0, 1, 2]);
  });
});
