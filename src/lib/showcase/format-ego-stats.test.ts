import { describe, expect, it } from "vitest";

import {
  buildEgoStatsSegments,
  egoStatsDisplayParts,
} from "./format-ego-stats";

describe("buildEgoStatsSegments", () => {
  it("formats rank, likes, and win rate", () => {
    const segments = buildEgoStatsSegments(
      { rank: 4, weeklyLikes: 11 },
      {
        vehicleId: "v1",
        swipeCount: 12,
        likeRatePercent: 58,
      },
    );
    expect(segments.rank).toBe("Platz 4");
    expect(segments.likes).toBe("11 Likes");
    expect(segments.winRate).toBe("🔥 58% Win-Rate");
    expect(egoStatsDisplayParts(segments)).toEqual([
      "Platz 4",
      "11 Likes",
      "🔥 58% Win-Rate",
    ]);
  });

  it("uses singular like label", () => {
    const segments = buildEgoStatsSegments({ rank: 1, weeklyLikes: 1 }, null);
    expect(segments.likes).toBe("1 Like");
  });

  it("returns empty parts when inputs are null", () => {
    expect(egoStatsDisplayParts(buildEgoStatsSegments(null, null))).toEqual([]);
  });
});
