import { describe, expect, it } from "vitest";

import {
  evaluateCaptureQuality,
  laplacianVarianceFromImageData,
  meanLuminanceFromImageData,
} from "@/lib/utils/capture-quality-gate";

function mockImageData(
  width: number,
  height: number,
  rgb: [number, number, number],
): { data: Uint8ClampedArray; width: number; height: number } {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }
  return { data, width, height };
}

function mockCheckerboard(
  width: number,
  height: number,
): { data: Uint8ClampedArray; width: number; height: number } {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const value = (x + y) % 2 === 0 ? 255 : 0;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

describe("capture-quality-gate", () => {
  it("flags flat images as blurry and dark images as underexposed", () => {
    const flat = mockImageData(64, 64, [180, 180, 180]);
    expect(laplacianVarianceFromImageData(flat as ImageData)).toBe(0);
    expect(
      evaluateCaptureQuality(
        0,
        meanLuminanceFromImageData(flat as ImageData),
      ).issue,
    ).toBe("blur");

    const dark = mockImageData(64, 64, [20, 20, 20]);
    expect(
      evaluateCaptureQuality(
        500,
        meanLuminanceFromImageData(dark as ImageData),
      ).issue,
    ).toBe("dark");
  });

  it("accepts sharp high-contrast patterns with adequate brightness", () => {
    const sharp = mockCheckerboard(64, 64);
    const sharpness = laplacianVarianceFromImageData(sharp as ImageData);
    const luminance = meanLuminanceFromImageData(sharp as ImageData);
    expect(sharpness).toBeGreaterThan(1000);
    expect(evaluateCaptureQuality(sharpness, luminance).isReady).toBe(true);
  });
});
