import { describe, expect, it } from "vitest";

import { mapContainerRectToVideoCrop } from "@/lib/utils/a4-auto-scan";

describe("mapContainerRectToVideoCrop", () => {
  it("maps centered guide frame on portrait container (video taller than cover crop)", () => {
    const container = { left: 0, top: 0, width: 390, height: 800 };
    const guide = { left: 20, top: 120, width: 350, height: 495 };

    const crop = mapContainerRectToVideoCrop(1080, 1920, container, guide);

    expect(crop.sw).toBeGreaterThan(0);
    expect(crop.sh).toBeGreaterThan(0);
    expect(crop.sx).toBeGreaterThanOrEqual(0);
    expect(crop.sy).toBeGreaterThanOrEqual(0);
    expect(crop.sx + crop.sw).toBeLessThanOrEqual(1080);
    expect(crop.sy + crop.sh).toBeLessThanOrEqual(1920);
    expect(crop.sh / crop.sw).toBeCloseTo(495 / 350, 1);
  });
});
