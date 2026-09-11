import "server-only";

import { createCanvas, loadImage } from "@napi-rs/canvas";

import { SPATIAL_LAYER_COUNT } from "@/lib/vehicles/spatial-scene-constants";

type Rgba = { r: number; g: number; b: number; a: number };

function readPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): Rgba {
  const index = (y * width + x) * 4;
  return {
    r: data[index] ?? 0,
    g: data[index + 1] ?? 0,
    b: data[index + 2] ?? 0,
    a: data[index + 3] ?? 0,
  };
}

function writePixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  pixel: Rgba,
): void {
  const index = (y * width + x) * 4;
  data[index] = pixel.r;
  data[index + 1] = pixel.g;
  data[index + 2] = pixel.b;
  data[index + 3] = pixel.a;
}

/**
 * Approximate depth from vertical position inside the subject bounds (far = top).
 */
function buildDepthBands(
  width: number,
  height: number,
  data: Uint8ClampedArray,
): Uint8Array {
  const depth = new Uint8Array(width * height);
  let minY = height;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = readPixel(data, width, x, y).a;
      if (alpha < 16) continue;
      found = true;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  if (!found) return depth;

  const span = Math.max(maxY - minY, 1);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = readPixel(data, width, x, y);
      if (pixel.a < 16) continue;
      const t = (y - minY) / span;
      if (t < 0.34) depth[y * width + x] = 0;
      else if (t < 0.67) depth[y * width + x] = 1;
      else depth[y * width + x] = 2;
    }
  }

  return depth;
}

function extractBandLayer(
  source: Uint8ClampedArray,
  depth: Uint8Array,
  width: number,
  height: number,
  band: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(source.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const pixel = readPixel(source, width, x, y);
      if (depth[index] === band) {
        writePixel(out, width, x, y, pixel);
      }
    }
  }
  return out;
}

function canvasFromRgba(
  width: number,
  height: number,
  data: Uint8ClampedArray,
) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(data);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Build three RGBA layers (far → near) from a vehicle PNG for spatial scroll parallax.
 */
export async function generateSpatialLayersFromPng(
  pngBytes: Buffer,
): Promise<Buffer[]> {
  const image = await loadImage(pngBytes);
  const width = image.width;
  const height = image.height;
  const baseCanvas = createCanvas(width, height);
  const baseCtx = baseCanvas.getContext("2d");
  baseCtx.drawImage(image, 0, 0, width, height);
  const source = baseCtx.getImageData(0, 0, width, height);
  const depth = buildDepthBands(width, height, source.data);

  const layers: Buffer[] = [];
  for (let band = 0; band < SPATIAL_LAYER_COUNT; band += 1) {
    const bandData = extractBandLayer(source.data, depth, width, height, band);
    const layerCanvas = canvasFromRgba(width, height, bandData);
    layers.push(layerCanvas.toBuffer("image/png"));
  }

  return layers;
}
