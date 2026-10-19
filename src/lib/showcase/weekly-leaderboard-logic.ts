export type WeeklyLeaderEntry = {
  vehicleId: string;
  weeklyLikes: number;
};

/** True when this vehicle just took sole #1 on the 7-day like leaderboard. */
export function becameWeeklyTopBuildLeader(
  vehicleId: string,
  topBefore: readonly WeeklyLeaderEntry[],
  topAfter: readonly WeeklyLeaderEntry[],
): boolean {
  const leaderAfter = topAfter[0];
  if (!leaderAfter || leaderAfter.vehicleId !== vehicleId) {
    return false;
  }

  const leaderBefore = topBefore[0];
  if (leaderBefore?.vehicleId === vehicleId) {
    return false;
  }

  const runnerUp = topAfter[1];
  if (runnerUp && runnerUp.weeklyLikes >= leaderAfter.weeklyLikes) {
    return false;
  }

  return true;
}

import { showcaseCalendarWeekKey } from "@/lib/showcase/showcase-calendar-week";

/** Calendar week bucket (Mon–So Europe/Berlin) for weekly rank awards & emails. */
export function weeklyTopBuildReminderWeekKey(date = new Date()): string {
  return showcaseCalendarWeekKey(date);
}
