import { describe, expect, it } from "vitest";

import { resolveShowcaseSwipeHero } from "@/lib/showcase/resolve-showcase-swipe-hero";

describe("resolveShowcaseSwipeHero", () => {
  const vehicleId = "11111111-1111-4111-8111-111111111111";

  it("uses silhouette proxy when owner upload is declared", () => {
    const hero = resolveShowcaseSwipeHero({
      vehicleId,
      make: "BMW",
      model: "M3",
      hasSilhouette: true,
      silhouetteImageUrl: "https://x.supabase.co/storage/v1/object/public/bucket/a.png?v=1",
    });
    expect(hero.heroImageSrc).toContain(`/api/vehicle/silhouette/${vehicleId}`);
    expect(hero.heroImageUsesCover).toBe(true);
  });

  it("prefers catalog when no silhouette is declared", () => {
    const hero = resolveShowcaseSwipeHero({
      vehicleId,
      make: "BMW",
      model: "M3",
      hasSilhouette: false,
    });
    expect(hero.heroImageSrc).toContain("/api/vehicle/catalog/");
    expect(hero.heroImageUsesCover).toBe(false);
  });
});
