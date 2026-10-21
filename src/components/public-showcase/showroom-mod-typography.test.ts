import { describe, expect, it } from "vitest";

import {
  showroomModLabelTypography,
  showroomModVendorTypography,
} from "./showroom-mod-typography";

describe("showroomModLabelTypography", () => {
  it("scales down for long labels", () => {
    const short = showroomModLabelTypography("KW V3");
    expect(short.style).toBeUndefined();
    expect(short.className).toContain("0.94rem");

    const long = showroomModLabelTypography("x".repeat(50));
    expect(long.style?.fontSize).toContain("clamp");

    const veryLong = showroomModLabelTypography("x".repeat(80));
    expect(veryLong.style?.fontSize).toContain("0.72rem");
  });
});

describe("showroomModVendorTypography", () => {
  it("uses normal case for long vendor names", () => {
    expect(showroomModVendorTypography("BBS")).toContain("uppercase");
    expect(
      showroomModVendorTypography("AC Schnitzer Performance Tuning"),
    ).toContain("normal-case");
  });
});
