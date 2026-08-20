import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";

import { isJpegBytes, isPngBytes } from "./silhouette-bytes";
import {
  HEADER_PHOTO_MAX_EDGE,
  normalizeVehicleHeaderPhoto,
} from "./normalize-vehicle-header-photo";

describe("normalizeVehicleHeaderPhoto", () => {
  it("converts JPEG input to PNG output", async () => {
    const canvas = createCanvas(2400, 1600);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgb(40, 80, 120)";
    ctx.fillRect(0, 0, 2400, 1600);
    const jpeg = canvas.toBuffer("image/jpeg");

    expect(isJpegBytes(jpeg)).toBe(true);

    const output = await normalizeVehicleHeaderPhoto(jpeg);

    expect(isPngBytes(output)).toBe(true);
    const outCanvas = createCanvas(1, 1);
    const img = await (await import("@napi-rs/canvas")).loadImage(output);
    expect(img.width).toBeLessThanOrEqual(HEADER_PHOTO_MAX_EDGE);
    expect(img.height).toBeLessThanOrEqual(HEADER_PHOTO_MAX_EDGE);
    outCanvas.width = img.width;
  });
});
