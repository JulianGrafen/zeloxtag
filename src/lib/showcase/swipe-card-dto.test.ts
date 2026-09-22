import { describe, expect, it } from "vitest";

import {
  mapSwipeCandidateToCard,
  type ShowcaseSwipeCandidateRow,
} from "@/lib/showcase/swipe-card-dto";

describe("mapSwipeCandidateToCard", () => {
  const base: ShowcaseSwipeCandidateRow = {
    vehicle_id: "veh-1",
    public_slug: "bmw-m3-abc",
    make: "BMW",
    model: "M3",
    year: 2020,
    power_ps: 480,
    torque_nm: 600,
    accel_0_100_sec: 3.9,
    accel_100_200_sec: 11.2,
    modification_count: 4,
    has_silhouette: true,
  };

  it("maps public fields and hero proxy", () => {
    const card = mapSwipeCandidateToCard(base);
    expect(card).toEqual({
      publicSlug: "bmw-m3-abc",
      make: "BMW",
      model: "M3",
      year: 2020,
      heroImageSrc: "/api/vehicle/silhouette/veh-1",
      powerPs: 480,
      torqueNm: 600,
      accel0To100Sec: 3.9,
      accel100To200Sec: 11.2,
      modificationCount: 4,
    });
  });

  it("rejects missing slug", () => {
    expect(
      mapSwipeCandidateToCard({ ...base, public_slug: "  " }),
    ).toBeNull();
  });

  it("omits hero when no silhouette", () => {
    const card = mapSwipeCandidateToCard({
      ...base,
      has_silhouette: false,
    });
    expect(card?.heroImageSrc).toBeNull();
  });
});
