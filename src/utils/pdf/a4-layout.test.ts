import { describe, expect, it } from "vitest";

import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  computeA4ContainLayout,
  computeScaledDimensions,
} from "./a4-layout";

describe("computeA4ContainLayout", () => {
  it("centers a landscape image with full page width", () => {
    const layout = computeA4ContainLayout(2000, 1000);

    expect(layout.widthMm).toBe(A4_WIDTH_MM);
    expect(layout.heightMm).toBe(A4_WIDTH_MM / 2);
    expect(layout.xMm).toBe(0);
    expect(layout.yMm).toBe((A4_HEIGHT_MM - layout.heightMm) / 2);
  });

  it("centers a portrait image with full page height", () => {
    const layout = computeA4ContainLayout(1000, 2000);

    expect(layout.heightMm).toBe(A4_HEIGHT_MM);
    expect(layout.widthMm).toBe(A4_HEIGHT_MM / 2);
    expect(layout.yMm).toBe(0);
    expect(layout.xMm).toBe((A4_WIDTH_MM - layout.widthMm) / 2);
  });

  it("preserves aspect ratio for near-A4 images", () => {
    const layout = computeA4ContainLayout(2100, 2970);
    const aspect = layout.widthMm / layout.heightMm;

    expect(aspect).toBeCloseTo(A4_WIDTH_MM / A4_HEIGHT_MM, 5);
    expect(layout.widthMm).toBeLessThanOrEqual(A4_WIDTH_MM);
    expect(layout.heightMm).toBeLessThanOrEqual(A4_HEIGHT_MM);
    expect(layout.xMm).toBeGreaterThanOrEqual(0);
    expect(layout.yMm).toBeGreaterThanOrEqual(0);
  });
});

describe("computeScaledDimensions", () => {
  it("does not upscale small images", () => {
    const result = computeScaledDimensions(800, 600, 1500);

    expect(result.scale).toBe(1);
    expect(result.widthPx).toBe(800);
    expect(result.heightPx).toBe(600);
  });

  it("scales down wide images to the max dimension", () => {
    const result = computeScaledDimensions(3000, 1500, 1500);

    expect(result.widthPx).toBe(1500);
    expect(result.heightPx).toBe(750);
    expect(result.scale).toBe(0.5);
  });

  it("scales down tall images to the max dimension", () => {
    const result = computeScaledDimensions(1200, 2400, 1500);

    expect(result.heightPx).toBe(1500);
    expect(result.widthPx).toBe(750);
    expect(result.scale).toBe(0.625);
  });
});
