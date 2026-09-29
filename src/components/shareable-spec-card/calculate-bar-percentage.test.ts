import { describe, expect, it } from "vitest";

import {
  calculateBarPercentage,
  calculateBarPercentageLowerIsBetter,
} from "./calculate-bar-percentage";

describe("calculateBarPercentage", () => {
  it("returns ratio against max", () => {
    expect(calculateBarPercentage(500, 1000)).toBe(50);
  });

  it("clamps invalid input to zero", () => {
    expect(calculateBarPercentage(0, 1000)).toBe(0);
    expect(calculateBarPercentage(100, 0)).toBe(0);
  });
});

describe("calculateBarPercentageLowerIsBetter", () => {
  it("fills more for lower kg/ps", () => {
    expect(calculateBarPercentageLowerIsBetter(4, 3, 12)).toBeGreaterThan(
      calculateBarPercentageLowerIsBetter(8, 3, 12),
    );
  });
});
