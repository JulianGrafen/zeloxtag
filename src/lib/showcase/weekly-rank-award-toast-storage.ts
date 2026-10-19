const STORAGE_PREFIX = "zt_weekly_rank_award_toast_v1:";

export function wasWeeklyRankAwardToastShown(awardId: string): boolean {
  if (typeof window === "undefined") return true;
  return window.sessionStorage.getItem(`${STORAGE_PREFIX}${awardId}`) === "1";
}

export function markWeeklyRankAwardToastShown(awardId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`${STORAGE_PREFIX}${awardId}`, "1");
}
