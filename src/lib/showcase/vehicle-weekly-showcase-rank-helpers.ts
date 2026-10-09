export type TopThreeWeeklyRank = 1 | 2 | 3;

export function isTopThreeRank(rank: number): rank is TopThreeWeeklyRank {
  return rank === 1 || rank === 2 || rank === 3;
}

export function topThreeWeeklyRankOrNull(
  rank: number,
): TopThreeWeeklyRank | null {
  return isTopThreeRank(rank) ? rank : null;
}
