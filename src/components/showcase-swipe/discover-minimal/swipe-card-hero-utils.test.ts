import { describe, expect, it } from "vitest";

import { resolveSwipeCardHeroPresentation } from "./swipe-card-hero-utils";

describe("resolveSwipeCardHeroPresentation", () => {
  it("zooms owner silhouette proxies to fill the card", () => {
    const presentation = resolveSwipeCardHeroPresentation(
      "/api/vehicle/silhouette/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?w=640&v=1",
      true,
    );
    expect(presentation.objectFit).toBe("cover");
    expect(presentation.imageClassName).toContain("scale-[1.28]");
  });

  it("uses scaled contain for silhouette catalog fallback", () => {
    const presentation = resolveSwipeCardHeroPresentation(
      "/api/vehicle/silhouette/veh-1?w=520",
      false,
    );
    expect(presentation.objectFit).toBe("contain");
    expect(presentation.imageClassName).toContain("object-bottom");
  });

  it("uses contain for static cutout assets", () => {
    const presentation = resolveSwipeCardHeroPresentation(
      "/vehicles/m3-f82.png",
    );
    expect(presentation.objectFit).toBe("contain");
  });
});
