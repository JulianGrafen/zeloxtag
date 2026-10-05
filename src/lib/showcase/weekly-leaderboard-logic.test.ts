import { describe, expect, it } from "vitest";

import {
  becameWeeklyTopBuildLeader,
  weeklyTopBuildReminderWeekKey,
} from "@/lib/showcase/weekly-leaderboard-logic";

describe("becameWeeklyTopBuildLeader", () => {
  it("returns true when vehicle overtakes the previous leader", () => {
    expect(
      becameWeeklyTopBuildLeader(
        "veh-b",
        [{ vehicleId: "veh-a", weeklyLikes: 5 }],
        [
          { vehicleId: "veh-b", weeklyLikes: 6 },
          { vehicleId: "veh-a", weeklyLikes: 5 },
        ],
      ),
    ).toBe(true);
  });

  it("returns false when vehicle was already leader", () => {
    expect(
      becameWeeklyTopBuildLeader(
        "veh-a",
        [{ vehicleId: "veh-a", weeklyLikes: 5 }],
        [
          { vehicleId: "veh-a", weeklyLikes: 6 },
          { vehicleId: "veh-b", weeklyLikes: 4 },
        ],
      ),
    ).toBe(false);
  });

  it("returns false on a tie for first place", () => {
    expect(
      becameWeeklyTopBuildLeader(
        "veh-b",
        [{ vehicleId: "veh-a", weeklyLikes: 5 }],
        [
          { vehicleId: "veh-b", weeklyLikes: 5 },
          { vehicleId: "veh-a", weeklyLikes: 5 },
        ],
      ),
    ).toBe(false);
  });
});

describe("weeklyTopBuildReminderWeekKey", () => {
  it("returns a stable ISO week label", () => {
    expect(
      weeklyTopBuildReminderWeekKey(new Date("2026-04-06T12:00:00.000Z")),
    ).toMatch(/^\d{4}-W\d{2}$/);
  });
});
