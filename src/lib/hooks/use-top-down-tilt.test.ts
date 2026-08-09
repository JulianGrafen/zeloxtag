import { describe, expect, it } from "vitest";

import {
  TOP_DOWN_LEVEL_TOLERANCE_DEG,
  computeTiltFromBetaGamma,
  computeTiltFromGravity,
} from "@/lib/hooks/use-top-down-tilt";

describe("computeTiltFromBetaGamma", () => {
  it("is level when phone is flat (face up or face down)", () => {
    expect(computeTiltFromBetaGamma(0, 0).isLevel).toBe(true);
    expect(computeTiltFromBetaGamma(180, 0).isLevel).toBe(true);
    expect(computeTiltFromBetaGamma(-180, 0).isLevel).toBe(true);
  });

  it("is not level when phone is vertical", () => {
    const result = computeTiltFromBetaGamma(90, 0);
    expect(result.isLevel).toBe(false);
    expect(result.tiltDeg).toBeGreaterThan(TOP_DOWN_LEVEL_TOLERANCE_DEG);
  });

  it("includes roll in total tilt", () => {
    const result = computeTiltFromBetaGamma(0, 20);
    expect(result.isLevel).toBe(false);
    expect(result.rollDeg).toBe(20);
  });
});

describe("computeTiltFromGravity", () => {
  it("is level when gravity is perpendicular to the screen plane", () => {
    expect(computeTiltFromGravity(0, 0, 9.8).isLevel).toBe(true);
    expect(computeTiltFromGravity(0, 0, -9.8).isLevel).toBe(true);
  });

  it("is not level when gravity has in-plane components", () => {
    const result = computeTiltFromGravity(0, 9.8, 0);
    expect(result.isLevel).toBe(false);
    expect(result.tiltDeg).toBeGreaterThan(80);
  });

  it("detects small tilt off parallel", () => {
    const result = computeTiltFromGravity(0.4, 0.2, -9.75);
    expect(result.tiltDeg).toBeGreaterThan(0);
    expect(result.tiltDeg).toBeLessThan(TOP_DOWN_LEVEL_TOLERANCE_DEG + 2);
    expect(result.isLevel).toBe(true);
  });
});
