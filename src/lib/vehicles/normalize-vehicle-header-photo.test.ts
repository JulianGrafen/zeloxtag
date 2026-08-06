import { describe, expect, it } from "vitest";
import sharp from "sharp";

import {
  HEADER_PHOTO,
  normalizeVehicleHeaderPhoto,
} from "./normalize-vehicle-header-photo";

describe("normalizeVehicleHeaderPhoto", () => {
  it("crops to the header frame dimensions", async () => {
    const source = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: { r: 40, g: 80, b: 120 },
      },
    })
      .jpeg()
      .toBuffer();

    const output = await normalizeVehicleHeaderPhoto(source);
    const meta = await sharp(output).metadata();

    expect(meta.width).toBe(HEADER_PHOTO.width);
    expect(meta.height).toBe(HEADER_PHOTO.height);
    expect(meta.format).toBe("png");
  });
});
