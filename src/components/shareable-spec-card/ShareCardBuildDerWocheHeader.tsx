import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import { cn } from "@/lib/utils";

import {
  WEEKLY_RANK_STORY_ACCENT,
  weeklyRankStoryCardKicker,
} from "./weekly-rank-story-card-copy";

type ShareCardBuildDerWocheHeaderProps = {
  rank: TopThreeWeeklyRank;
  className?: string;
  /** Story vs post scale inside the 1080×1920 / 1080×1440 canvas. */
  format?: "story" | "post";
};

export function ShareCardBuildDerWocheHeader({
  rank,
  className,
  format = "story",
}: ShareCardBuildDerWocheHeaderProps) {
  const isPost = format === "post";
  const rankSizePx = isPost ? 88 : 112;
  const kickerSizePx = isPost ? 26 : 32;

  return (
    <div
      className={cn("pointer-events-none select-none", className)}
      aria-hidden
    >
      <p
        className="font-[family-name:var(--font-display)] font-extrabold leading-none tracking-[-0.04em] drop-shadow-[0_4px_28px_rgba(0,0,0,0.65)]"
        style={{ fontSize: rankSizePx, color: WEEKLY_RANK_STORY_ACCENT }}
      >
        #{rank}
      </p>
      <p
        className="mt-1 font-[family-name:var(--font-display)] font-bold uppercase leading-[1.05] drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)]"
        style={{
          fontSize: kickerSizePx,
          color: WEEKLY_RANK_STORY_ACCENT,
          letterSpacing: "0.14em",
        }}
      >
        {weeklyRankStoryCardKicker(rank)}
      </p>
    </div>
  );
}
