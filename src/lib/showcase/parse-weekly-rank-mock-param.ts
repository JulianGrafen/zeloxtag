import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";

/** Dev-only: `?mockWeeklyRank=1|2|3` on garage/tag dashboard. */
export function parseWeeklyRankMockParam(
  value: string | undefined,
): TopThreeWeeklyRank | null {
  if (process.env.NODE_ENV === "production") return null;
  const raw = value?.trim();
  if (!raw) return null;
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  if (raw === "true") return 1;
  return null;
}
