import { describe, expect, it } from "vitest";
import sharp from "sharp";

import { isJpegBytes, isPngBytes } from "./silhouette-bytes";
import {
  HEADER_PHOTO_MAX_EDGE,
  normalizeVehicleHeaderPhoto,
} from "./normalize-vehicle-header-photo";

describe("normalizeVehicleHeaderPhoto", () => {
  it("converts JPEG input to PNG output", async () => {
    const jpeg = await sharp({
      create: {
        width: 2400,
        height: 1600,
        channels: 3,
        background: { r: 40, g: 80, b: 120 },
      },
    })
      .jpeg()
      .toBuffer();

    expect(isJpegBytes(jpeg)).toBe(true);

    const output = await normalizeVehicleHeaderPhoto(jpeg);
    const meta = await sharp(output).metadata();

    expect(isPngBytes(output)).toBe(true);
    expect(meta.width).toBeLessThanOrEqual(HEADER_PHOTO_MAX_EDGE);
    expect(meta.height).toBeLessThanOrEqual(HEADER_PHOTO_MAX_EDGE);
    expect(meta.format).toBe("png");
  });
});
