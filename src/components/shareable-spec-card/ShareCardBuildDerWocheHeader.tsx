import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import type { ShareCardFormat } from "@/lib/share/share-card-variant";
import { cn } from "@/lib/utils";

import {
  WEEKLY_RANK_STORY_ACCENT,
  weeklyRankStoryCardKicker,
} from "./weekly-rank-story-card-copy";
import {
  weeklyRankStoryKickerFontPx,
  weeklyRankStoryRankFontPx,
} from "./weekly-rank-story-rank-typography";

type ShareCardBuildDerWocheHeaderProps = {
  rank: TopThreeWeeklyRank;
  className?: string;
  format?: ShareCardFormat;
};

export function ShareCardBuildDerWocheHeader({
  rank,
  className,
  format = "story",
}: ShareCardBuildDerWocheHeaderProps) {
  const rankSizePx = weeklyRankStoryRankFontPx(format);
  const kickerSizePx = weeklyRankStoryKickerFontPx(format);

  return (
    <div
      className={cn("pointer-events-none select-none", className)}
      aria-hidden
    >
      <p
        className="font-[family-name:var(--font-bebas-neue)] font-normal leading-[0.92] tracking-[0.02em] drop-shadow-[0_6px_32px_rgba(0,0,0,0.55)]"
        style={{ fontSize: rankSizePx, color: WEEKLY_RANK_STORY_ACCENT }}
      >
        #{rank}
      </p>
      <p
        className="font-[family-name:var(--font-bebas-neue)] font-normal uppercase leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
        style={{
          marginTop: rankSizePx * 0.04,
          fontSize: kickerSizePx,
          color: WEEKLY_RANK_STORY_ACCENT,
          letterSpacing: "0.22em",
        }}
      >
        {weeklyRankStoryCardKicker(rank)}
      </p>
    </div>
  );
}
