import { describe, expect, it } from "vitest";

import { formatShowcaseSwipeDailyStatsLine } from "@/lib/showcase/showcase-swipe-daily-stats-copy";

describe("formatShowcaseSwipeDailyStatsLine", () => {
  it("formats count and heat suffix", () => {
    expect(
      formatShowcaseSwipeDailyStatsLine({ swipeCount: 412, likeRatePercent: 89 }),
    ).toBe("Dein Auto wurde heute 412-mal geswiped (89 % 🔥)");
  });

  it("omits fire below heat threshold", () => {
    expect(
      formatShowcaseSwipeDailyStatsLine({ swipeCount: 12, likeRatePercent: 50 }),
    ).toBe("Dein Auto wurde heute 12-mal geswiped (50 %)");
  });
});
