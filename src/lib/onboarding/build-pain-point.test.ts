import { describe, expect, it } from "vitest";

import {
  BUILD_PAIN_POINT_EMPATHY_LINE,
  BUILD_PAIN_POINT_OPTIONS,
  isZeloxBuildPainPoint,
} from "@/lib/onboarding/build-pain-point";

describe("build-pain-point", () => {
  it("exposes three onboarding options and empathy copy", () => {
    expect(BUILD_PAIN_POINT_OPTIONS).toHaveLength(3);
    expect(BUILD_PAIN_POINT_EMPATHY_LINE).toContain("ZeloxTag");
  });

  it("validates stored pain point ids", () => {
    expect(isZeloxBuildPainPoint("costs")).toBe(true);
    expect(isZeloxBuildPainPoint("documents")).toBe(true);
    expect(isZeloxBuildPainPoint("showcase")).toBe(true);
    expect(isZeloxBuildPainPoint("other")).toBe(false);
  });
});
