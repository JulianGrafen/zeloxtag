import { readFileSync } from "fs";
import path from "path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  CUTOUT_CANVAS,
  normalizeVehicleCutout,
} from "./normalize-vehicle-cutout";

describe("normalizeVehicleCutout", () => {
  it("fits catalog-style cutouts into the dashboard canvas", async () => {
    const fixture = readFileSync(
      path.join(process.cwd(), "public/vehicles/bmw-530d.png"),
    );

    const out = await normalizeVehicleCutout(fixture);
    const meta = await sharp(out).metadata();

    expect(meta.width).toBe(CUTOUT_CANVAS.width);
    expect(meta.height).toBe(CUTOUT_CANVAS.height);
    expect(meta.hasAlpha).toBe(true);
    expect(meta.format).toBe("png");
  });

  it("flips right-facing cutouts to face left like the mocks", async () => {
    const fixture = readFileSync(
      path.join(process.cwd(), "public/vehicles/rx8.png"),
    );
    const flipped = await sharp(fixture).flop().png().toBuffer();
    const out = await normalizeVehicleCutout(flipped);

    const { data, info } = await sharp(out)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Sample bright mass in left vs right thirds of opaque region.
    let left = 0;
    let right = 0;
    let minX = info.width;
    let maxX = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * 4;
        if (data[i + 3] > 40) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }
    const third = Math.max(1, Math.floor((maxX - minX + 1) / 3));
    for (let y = Math.floor(info.height * 0.2); y < Math.floor(info.height * 0.5); y++) {
      for (let dx = 0; dx < third; dx++) {
        const lx = minX + dx;
        const rx = maxX - dx;
        const li = (y * info.width + lx) * 4;
        const ri = (y * info.width + rx) * 4;
        if (data[li + 3] > 40) left += data[li] + data[li + 1] + data[li + 2];
        if (data[ri + 3] > 40) right += data[ri] + data[ri + 1] + data[ri + 2];
      }
    }

    // Facing left → nose/highlight mass tends to sit on the left third.
    expect(left).toBeGreaterThan(right * 0.85);
  });
});
