import { describe, expect, it } from "vitest";

import { parseAuflagenRegions } from "@/lib/ocr/auflagen-crop";

describe("parseAuflagenRegions", () => {
  it("normalizes valid regions and drops invalid boxes", () => {
    const regions = parseAuflagenRegions([
      { code: "744", top: 0.1, left: 0.05, bottom: 0.4, right: 0.95 },
      { code: "a02", top: 0.5, left: 0.1, bottom: 0.9, right: 0.8 },
      { code: "X", top: 0.2, left: 0.3, bottom: 0.1, right: 0.4 },
      { code: "", top: 0, left: 0, bottom: 1, right: 1 },
    ]);

    expect(regions).toEqual([
      { code: "744", top: 0.1, left: 0.05, bottom: 0.4, right: 0.95 },
      { code: "A02", top: 0.5, left: 0.1, bottom: 0.9, right: 0.8 },
    ]);
  });

  it("returns empty array for non-array input", () => {
    expect(parseAuflagenRegions(null)).toEqual([]);
    expect(parseAuflagenRegions({})).toEqual([]);
  });
});
