import { describe, expect, it } from "vitest";

import {
  filledSegments,
  filledSegmentsLowerIsBetter,
  SHOWCASE_QUARTETT_ACCEL_0_100_MAX_SEC,
  SHOWCASE_QUARTETT_ACCEL_0_100_MIN_SEC,
  SHOWCASE_QUARTETT_POWER_PS_MAX,
  SHOWCASE_QUARTETT_SEGMENT_COUNT,
} from "./showcase-quartett-scales";

describe("filledSegments", () => {
  it("returns 0 for invalid or zero input", () => {
    expect(filledSegments(0, SHOWCASE_QUARTETT_POWER_PS_MAX)).toBe(0);
    expect(filledSegments(-10, SHOWCASE_QUARTETT_POWER_PS_MAX)).toBe(0);
    expect(filledSegments(100, 0)).toBe(0);
  });

  it("fills more segments for faster acceleration times", () => {
    expect(
      filledSegmentsLowerIsBetter(
        2.5,
        SHOWCASE_QUARTETT_ACCEL_0_100_MIN_SEC,
        SHOWCASE_QUARTETT_ACCEL_0_100_MAX_SEC,
      ),
    ).toBe(SHOWCASE_QUARTETT_SEGMENT_COUNT);
    expect(
      filledSegmentsLowerIsBetter(
        15,
        SHOWCASE_QUARTETT_ACCEL_0_100_MIN_SEC,
        SHOWCASE_QUARTETT_ACCEL_0_100_MAX_SEC,
      ),
    ).toBe(0);
  });

  it("rounds against scale max and clamps to segment count", () => {
    expect(
      filledSegments(193, SHOWCASE_QUARTETT_POWER_PS_MAX),
    ).toBe(2);
    expect(
      filledSegments(1000, SHOWCASE_QUARTETT_POWER_PS_MAX),
    ).toBe(SHOWCASE_QUARTETT_SEGMENT_COUNT);
    expect(
      filledSegments(2000, SHOWCASE_QUARTETT_POWER_PS_MAX),
    ).toBe(SHOWCASE_QUARTETT_SEGMENT_COUNT);
  });
});
