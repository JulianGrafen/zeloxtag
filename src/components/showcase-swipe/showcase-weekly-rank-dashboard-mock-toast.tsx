"use client";

import { useEffect, useRef } from "react";

import { weeklyRankAwardHeadline } from "@/lib/showcase/weekly-rank-award-keys";
import type { ShowcaseWeeklyRankAward } from "@/lib/showcase/weekly-rank-award-types";
import { showShowcaseWeeklyRankAwardToast } from "@/lib/ui/showcase-weekly-rank-award-toast";

type ShowcaseWeeklyRankDashboardMockToastProps = {
  award: ShowcaseWeeklyRankAward;
  entdeckenHref: string;
};

/** Dev preview — fires the same toast as Monday rank awards (no localStorage dedupe). */
export function ShowcaseWeeklyRankDashboardMockToast({
  award,
  entdeckenHref,
}: ShowcaseWeeklyRankDashboardMockToastProps) {
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    showShowcaseWeeklyRankAwardToast({
      headline: weeklyRankAwardHeadline(award.rank),
      rank: award.rank,
      weeklyLikes: award.weeklyLikes,
      entdeckenHref: `${entdeckenHref}${entdeckenHref.includes("?") ? "&" : "?"}weeklyAward=1`,
    });
  }, [award.rank, award.weeklyLikes, entdeckenHref]);

  return null;
}
