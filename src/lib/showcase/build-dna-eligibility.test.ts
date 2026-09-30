import { describe, expect, it } from "vitest";

import {
  hasOwnerShowcaseSpecificationText,
  isBuildDnaEligible,
} from "./build-dna-eligibility";

describe("build-dna-eligibility", () => {
  it("requires two mods when no owner text", () => {
    expect(
      isBuildDnaEligible(1, { notes: null, buildPersonalityLabels: [] }),
    ).toBe(false);
    expect(
      isBuildDnaEligible(2, { notes: null, buildPersonalityLabels: [] }),
    ).toBe(true);
  });

  it("allows specification text without public mods", () => {
    expect(hasOwnerShowcaseSpecificationText("  KW V3 Coilovers  ")).toBe(
      true,
    );
    expect(
      isBuildDnaEligible(0, {
        notes: "Stage 2 · Milltek · KW V3",
        buildPersonalityLabels: [],
      }),
    ).toBe(true);
  });

  it("allows build personality chips without mods", () => {
    expect(
      isBuildDnaEligible(0, {
        notes: null,
        buildPersonalityLabels: ["Daily"],
      }),
    ).toBe(true);
  });
});
