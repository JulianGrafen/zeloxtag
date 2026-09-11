import { describe, expect, it } from "vitest";

import {
  resolveShowroomHeroKind,
  showroomHeroUsesSpatialParallax,
} from "@/lib/vehicles/showroom-hero-kind";

describe("resolveShowroomHeroKind", () => {
  it("classifies silhouette proxy URLs", () => {
    expect(
      resolveShowroomHeroKind("/api/vehicle/silhouette/11111111-1111-4111-8111-111111111111"),
    ).toBe("silhouette");
  });

  it("classifies dyno chart heroes", () => {
    expect(
      resolveShowroomHeroKind(
        "/api/public/vehicle/11111111-1111-4111-8111-111111111111/dyno-chart",
      ),
    ).toBe("dyno");
  });

  it("treats gallery proxy images as photo heroes", () => {
    expect(
      resolveShowroomHeroKind(
        "/api/public/vehicle/abc/file?src=x",
      ),
    ).toBe("photo");
  });
});

describe("showroomHeroUsesSpatialParallax", () => {
  it("enables parallax for silhouette and photo only", () => {
    expect(showroomHeroUsesSpatialParallax("silhouette")).toBe(true);
    expect(showroomHeroUsesSpatialParallax("photo")).toBe(true);
    expect(showroomHeroUsesSpatialParallax("dyno")).toBe(false);
    expect(showroomHeroUsesSpatialParallax("none")).toBe(false);
  });
});
