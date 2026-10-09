import { describe, expect, it } from "vitest";

import { weeklyShowcaseRankForShareCard } from "@/lib/showcase/build-owner-shareable-build-data";

describe("weeklyShowcaseRankForShareCard", () => {
  it("returns top-three ranks only", () => {
    expect(weeklyShowcaseRankForShareCard({ rank: 1, weeklyLikes: 5 })).toBe(1);
    expect(weeklyShowcaseRankForShareCard({ rank: 3, weeklyLikes: 2 })).toBe(3);
    expect(weeklyShowcaseRankForShareCard({ rank: 4, weeklyLikes: 2 })).toBeUndefined();
    expect(weeklyShowcaseRankForShareCard(null)).toBeUndefined();
  });
});
