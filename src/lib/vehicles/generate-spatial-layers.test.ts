import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";

import { SPATIAL_LAYER_COUNT } from "@/lib/vehicles/spatial-scene-constants";
import { isPngBytes } from "@/lib/vehicles/silhouette-bytes";

import { generateSpatialLayersFromPng } from "./generate-spatial-layers";

function opaqueTestPng(width = 48, height = 64): Buffer {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(200, 40, 40, 1)";
  ctx.fillRect(8, 12, width - 16, height - 24);
  return canvas.toBuffer("image/png");
}

function countOpaquePixels(png: Buffer): number {
  const canvas = createCanvas(1, 1);
  return png.byteLength;
}

describe("generateSpatialLayersFromPng", () => {
  it("returns three PNG layers for an opaque vehicle photo", async () => {
    const source = opaqueTestPng();
    const layers = await generateSpatialLayersFromPng(source);

    expect(layers).toHaveLength(SPATIAL_LAYER_COUNT);
    for (const layer of layers) {
      expect(isPngBytes(new Uint8Array(layer))).toBe(true);
      expect(layer.byteLength).toBeGreaterThan(64);
      expect(countOpaquePixels(layer)).toBeGreaterThan(64);
    }
  });
});
