import { describe, expect, it } from "vitest";

import {
  isTopThreeRank,
  topThreeWeeklyRankOrNull,
} from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import { mapVehicleWeeklyShowcaseRankRow } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";

describe("mapVehicleWeeklyShowcaseRankRow", () => {
  it("maps a valid rank payload", () => {
    expect(
      mapVehicleWeeklyShowcaseRankRow({ rank: 4, weekly_likes: 3 }),
    ).toEqual({ rank: 4, weeklyLikes: 3 });
  });

  it("rejects zero likes", () => {
    expect(
      mapVehicleWeeklyShowcaseRankRow({ rank: 1, weekly_likes: 0 }),
    ).toBeNull();
  });

  it("rejects invalid input", () => {
    expect(mapVehicleWeeklyShowcaseRankRow(null)).toBeNull();
    expect(mapVehicleWeeklyShowcaseRankRow({ rank: "x", weekly_likes: 2 })).toBeNull();
  });
});

describe("isTopThreeRank", () => {
  it("accepts ranks 1–3 only", () => {
    expect(isTopThreeRank(1)).toBe(true);
    expect(isTopThreeRank(3)).toBe(true);
    expect(isTopThreeRank(4)).toBe(false);
  });

  it("maps to top-three or null", () => {
    expect(topThreeWeeklyRankOrNull(2)).toBe(2);
    expect(topThreeWeeklyRankOrNull(9)).toBeNull();
  });
});
