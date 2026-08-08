import { describe, expect, it } from "vitest";

import { detectPaperBoundsFromImageData } from "@/lib/utils/document-auto-detect";

function rgba(w: number, h: number, paint: (x: number, y: number) => [number, number, number]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const [r, g, b] = paint(x, y);
      const i = (y * w + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return data;
}

describe("detectPaperBoundsFromImageData", () => {
  it("finds a bright invoice rectangle on a dark desk", () => {
    const width = 200;
    const height = 280;
    const data = rgba(width, height, (x, y) => {
      const inPaper =
        x >= 40 && x <= 159 && y >= 30 && y <= 249;
      return inPaper ? [245, 245, 245] : [30, 32, 28];
    });

    const bounds = detectPaperBoundsFromImageData(data, width, height, {
      minAreaRatio: 0.2,
      insetRatio: 0,
    });

    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(38);
    expect(bounds!.y).toBeGreaterThanOrEqual(28);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(162);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(252);
  });

  it("returns null when no paper-like region is present", () => {
    const width = 120;
    const height = 160;
    const data = rgba(width, height, () => [20, 22, 18]);

    const bounds = detectPaperBoundsFromImageData(data, width, height);
    expect(bounds).toBeNull();
  });
});
