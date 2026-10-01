import { describe, expect, it } from "vitest";

import { buildClaimPreviewQuartettLines } from "@/lib/tags/claim-preview-quartett";

describe("buildClaimPreviewQuartettLines", () => {
  it("returns power and displacement bars when values are present", () => {
    const lines = buildClaimPreviewQuartettLines({
      powerPs: "320",
      displacementCc: "2998",
    });
    expect(lines.map((line) => line.key)).toEqual(["power", "displacement"]);
    expect(lines[0]?.value).toBe("320 PS");
    expect(lines[0]?.filled).toBeGreaterThan(0);
    expect(lines[1]?.value).toBe("2.998 ccm");
  });

  it("ignores empty or invalid input", () => {
    expect(buildClaimPreviewQuartettLines({ powerPs: "", displacementCc: "" })).toEqual(
      [],
    );
    expect(buildClaimPreviewQuartettLines({ powerPs: "abc" })).toEqual([]);
  });
});
