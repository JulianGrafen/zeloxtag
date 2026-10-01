import { describe, expect, it } from "vitest";

import { buildClaimPreviewQuartettLines } from "@/lib/tags/claim-preview-quartett";

describe("buildClaimPreviewQuartettLines", () => {
  it("returns quartett bars for power, torque, displacement, and accel", () => {
    const lines = buildClaimPreviewQuartettLines({
      powerPs: "320",
      torqueNm: "500",
      displacementCc: "2998",
      accel0To100Sec: "4,1",
      accel100To200Sec: "11,2",
    });
    expect(lines.map((line) => line.key)).toEqual([
      "power",
      "torque",
      "displacement",
      "accel0To100",
      "accel100To200",
    ]);
    expect(lines[0]?.value).toBe("320 PS");
    expect(lines[1]?.value).toBe("500 Nm");
    expect(lines[3]?.value).toBe("4.1 s");
    expect(lines[4]?.value).toBe("11.2 s");
  });

  it("ignores empty or invalid input", () => {
    expect(buildClaimPreviewQuartettLines({ powerPs: "", displacementCc: "" })).toEqual(
      [],
    );
    expect(buildClaimPreviewQuartettLines({ powerPs: "abc" })).toEqual([]);
  });
});
