import { describe, expect, it } from "vitest";

import {
  weeklyRankAwardEmailReminderKey,
  weeklyRankAwardHeadline,
} from "@/lib/showcase/weekly-rank-award-keys";

describe("weeklyRankAwardHeadline", () => {
  it("uses Build der Woche for rank 1", () => {
    expect(weeklyRankAwardHeadline(1)).toBe("Build der Woche");
  });

  it("labels ranks 2 and 3 distinctly", () => {
    expect(weeklyRankAwardHeadline(2)).toBe("Platz 2 der Woche");
    expect(weeklyRankAwardHeadline(3)).toBe("Top 3 der Woche");
  });
});

describe("weeklyRankAwardEmailReminderKey", () => {
  it("includes week, vehicle, and rank", () => {
    expect(
      weeklyRankAwardEmailReminderKey(
        "2026-W42",
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        1,
      ),
    ).toBe(
      "weekly_rank_award:2026-W42:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:r1",
    );
  });
});
