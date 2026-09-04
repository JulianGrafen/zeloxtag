import { describe, expect, it } from "vitest";

import {
  computeShinePositionFromGravity,
  computeShinePositionFromOrientation,
} from "@/lib/hooks/use-device-motion-shine";

describe("computeShinePositionFromOrientation", () => {
  it("centers shine at the baseline orientation", () => {
    const baseline = { beta: 82, gamma: 4 };
    const result = computeShinePositionFromOrientation(82, 4, baseline);
    expect(result).toEqual({ x: 50, y: 50 });
  });

  it("moves shine when the phone tilts left and forward", () => {
    const baseline = { beta: 82, gamma: 0 };
    const result = computeShinePositionFromOrientation(88, -10, baseline);
    expect(result?.x).toBeLessThan(50);
    expect(result?.y).toBeGreaterThan(50);
  });
});

describe("computeShinePositionFromGravity", () => {
  it("centers shine at the baseline gravity vector", () => {
    const baseline = { x: 0, y: 0, z: 1 };
    const result = computeShinePositionFromGravity(0, 0, 9.8, baseline);
    expect(result).toEqual({ x: 50, y: 50 });
  });

  it("moves shine when gravity shifts in the screen plane", () => {
    const baseline = { x: 0, y: 0, z: 1 };
    const result = computeShinePositionFromGravity(1.2, -0.8, 9.6, baseline);
    expect(result?.x).toBeGreaterThan(50);
    expect(result?.y).toBeLessThan(50);
  });
});
