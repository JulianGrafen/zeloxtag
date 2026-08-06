import { describe, expect, it } from "vitest";
import sharp from "sharp";

import {
  HEADER_PHOTO_MAX_EDGE,
  normalizeVehicleHeaderPhoto,
} from "./normalize-vehicle-header-photo";

describe("normalizeVehicleHeaderPhoto", () => {
  it("resizes large photos to PNG without upscaling", async () => {
    const source = await sharp({
      create: {
        width: 2400,
        height: 1600,
        channels: 3,
        background: { r: 40, g: 80, b: 120 },
      },
    })
      .jpeg()
      .toBuffer();

    const output = await normalizeVehicleHeaderPhoto(source);
    const meta = await sharp(output).metadata();

    expect(meta.width).toBeLessThanOrEqual(HEADER_PHOTO_MAX_EDGE);
    expect(meta.height).toBeLessThanOrEqual(HEADER_PHOTO_MAX_EDGE);
    expect(meta.format).toBe("png");
  });
});
