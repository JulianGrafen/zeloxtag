import { describe, expect, it } from "vitest";

import { mapWeeklyTopBuildRow } from "@/lib/showcase/weekly-top-builds-map";

describe("mapWeeklyTopBuildRow", () => {
  it("maps a valid weekly top row", () => {
    const build = mapWeeklyTopBuildRow({
      rank: 1,
      vehicle_id: "veh-1",
      public_slug: "bmw-m3",
      make: "BMW",
      model: "M3",
      year: 2021,
      weekly_likes: 12,
      has_silhouette: true,
    });
    expect(build).toEqual({
      rank: 1,
      vehicleId: "veh-1",
      publicSlug: "bmw-m3",
      make: "BMW",
      model: "M3",
      year: 2021,
      weeklyLikes: 12,
      heroImageSrc: expect.stringContaining("/api/vehicle/silhouette/veh-1"),
      heroImageUsesCover: true,
    });
  });

  it("rejects missing slug", () => {
    expect(
      mapWeeklyTopBuildRow({
        rank: 2,
        vehicle_id: "veh-1",
        public_slug: " ",
        make: "BMW",
        model: "M3",
        year: null,
        weekly_likes: 5,
        has_silhouette: false,
      }),
    ).toBeNull();
  });

  it("builds hero proxy URL even without stored silhouette", () => {
    const build = mapWeeklyTopBuildRow({
      rank: 2,
      vehicle_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      public_slug: "golf-r",
      make: "VW",
      model: "Golf R",
      year: 2016,
      weekly_likes: 3,
      has_silhouette: false,
    });
    expect(build?.heroImageSrc).toContain(
      "/api/vehicle/silhouette/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(build?.heroImageUsesCover).toBe(false);
  });

  it("rejects zero weekly likes", () => {
    expect(
      mapWeeklyTopBuildRow({
        rank: 3,
        vehicle_id: "veh-1",
        public_slug: "bmw-m3",
        make: "BMW",
        model: "M3",
        year: null,
        weekly_likes: 0,
        has_silhouette: false,
      }),
    ).toBeNull();
  });
});
