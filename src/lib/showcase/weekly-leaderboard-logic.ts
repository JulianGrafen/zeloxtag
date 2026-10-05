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

/** UTC ISO week bucket for one-shot weekly-top emails per vehicle. */
export function weeklyTopBuildReminderWeekKey(date = new Date()): string {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
