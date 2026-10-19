import Link from "next/link";
import { Sparkles } from "lucide-react";

import { weeklyRankAwardHeadline } from "@/lib/showcase/weekly-rank-award-keys";
import { WEEKLY_RANK_DASHBOARD_NOTICE_SUBLINE } from "@/lib/showcase/weekly-rank-story-share-copy";
import type { ShowcaseWeeklyRankAward } from "@/lib/showcase/weekly-rank-award-types";

type ShowcaseWeeklyRankDashboardNoticeProps = {
  award: ShowcaseWeeklyRankAward;
  entdeckenHref: string;
};

export function ShowcaseWeeklyRankDashboardNotice({
  award,
  entdeckenHref,
}: ShowcaseWeeklyRankDashboardNoticeProps) {
  const headline = weeklyRankAwardHeadline(award.rank);

  return (
    <Link
      href={`${entdeckenHref}${entdeckenHref.includes("?") ? "&" : "?"}weeklyAward=1`}
      className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-transparent px-4 py-3.5 no-underline transition active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
        <Sparkles className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9rem] font-semibold text-[color:var(--vd-text)]">
          {headline}
        </span>
        <span className="mt-0.5 block text-[0.78rem] text-[color:var(--vd-muted)]">
          {WEEKLY_RANK_DASHBOARD_NOTICE_SUBLINE}
        </span>
      </span>
      <span className="font-mono text-lg font-bold tabular-nums text-amber-600">
        #{award.rank}
      </span>
    </Link>
  );
}
