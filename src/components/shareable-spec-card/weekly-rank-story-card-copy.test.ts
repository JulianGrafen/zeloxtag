import { describe, expect, it } from "vitest";

import { weeklyRankStoryCardKicker } from "./weekly-rank-story-card-copy";

describe("weeklyRankStoryCardKicker", () => {
  it("uses Build der Woche copy for rank 1", () => {
    expect(weeklyRankStoryCardKicker(1)).toBe("Build der Woche");
  });
});
