import { describe, expect, it } from "vitest";

import { formatBuildDiscoverDashboardSubtitle } from "./build-discover-dashboard-subtitle";

describe("formatBuildDiscoverDashboardSubtitle", () => {
  it("shows total likes for owners", () => {
    expect(
      formatBuildDiscoverDashboardSubtitle({
        totalLikes: 3,
        unreadLikes: 0,
      }),
    ).toBe("3 Likes gesamt");
  });

  it("combines unread with total", () => {
    expect(
      formatBuildDiscoverDashboardSubtitle({
        totalLikes: 12,
        unreadLikes: 2,
      }),
    ).toBe("2 neu · 12 Likes gesamt");
  });

  it("shows weekly likes when all likes are this week", () => {
    expect(
      formatBuildDiscoverDashboardSubtitle({
        totalLikes: 3,
        unreadLikes: 0,
        weeklyLikes: 3,
      }),
    ).toBe("3 Likes diese Woche");
  });

  it("combines weekly with older total likes", () => {
    expect(
      formatBuildDiscoverDashboardSubtitle({
        totalLikes: 12,
        unreadLikes: 0,
        weeklyLikes: 2,
      }),
    ).toBe("2 Likes diese Woche · 12 Likes gesamt");
  });

  it("falls back when no likes yet", () => {
    expect(
      formatBuildDiscoverDashboardSubtitle({
        totalLikes: 0,
        unreadLikes: 0,
      }),
    ).toBe("Swipe · öffentliche Builds");
  });
});
