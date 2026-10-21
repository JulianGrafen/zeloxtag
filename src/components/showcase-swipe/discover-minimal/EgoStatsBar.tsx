"use client";

import { useState } from "react";
import { Heart, Share2 } from "lucide-react";

import type { ShareableBuildData } from "@/components/shareable-spec-card/types";
import {
  buildEgoStatsSegments,
  egoStatsDisplayParts,
} from "@/lib/showcase/format-ego-stats";
import {
  discoverOwnPlacementBadgeGlowClass,
  discoverOwnPlacementShellClass,
  discoverRankAccentGradient,
  discoverRankBadgeClass,
  discoverRankIsTopThree,
} from "@/lib/showcase/discover-weekly-rank-visual";
import type { VehicleShowcaseSwipeDailyStats } from "@/lib/showcase/vehicle-showcase-swipe-daily-stats-map";
import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
import { cn } from "@/lib/utils";

import { EgoShareSheet } from "./EgoShareSheet";

type EgoStatsBarProps = {
  ownWeeklyRank: VehicleWeeklyShowcaseRank | null;
  dailySwipeStats: VehicleShowcaseSwipeDailyStats | null;
  shareCardData: ShareableBuildData | null;
  vehicleId?: string;
  className?: string;
};

function secondaryStatsLine(
  ownWeeklyRank: VehicleWeeklyShowcaseRank | null,
  dailySwipeStats: VehicleShowcaseSwipeDailyStats | null,
): string | null {
  const segments = buildEgoStatsSegments(ownWeeklyRank, dailySwipeStats);
  if (ownWeeklyRank != null) {
    return segments.winRate;
  }
  const parts = egoStatsDisplayParts(segments);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function EgoStatsBar({
  ownWeeklyRank,
  dailySwipeStats,
  shareCardData,
  vehicleId,
  className,
}: EgoStatsBarProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const secondary = secondaryStatsLine(ownWeeklyRank, dailySwipeStats);
  const hasRank = ownWeeklyRank != null && ownWeeklyRank.rank >= 1;

  if (!hasRank && !secondary && !shareCardData) {
    return null;
  }

  const rank = ownWeeklyRank?.rank ?? 0;
  const likeWord =
    ownWeeklyRank?.weeklyLikes === 1 ? "Like" : "Likes";
  const topThree = hasRank && discoverRankIsTopThree(rank);

  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-30 mx-auto w-full max-w-lg",
          className,
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 rounded-[1.35rem] border bg-gradient-to-b px-3.5 py-3.5 backdrop-blur-md",
            hasRank
              ? discoverRankAccentGradient(rank)
              : "border-white/10 from-zinc-900/95 to-black shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
            hasRank && discoverOwnPlacementShellClass(rank),
          )}
          aria-label={
            hasRank
              ? `Deine Platzierung: Platz ${rank} diese Woche`
              : "Deine Showcase-Stats"
          }
        >
          {hasRank ? (
            <div
              className={cn(
                discoverRankBadgeClass(rank),
                "h-[3.25rem] min-w-[3.25rem] text-[1.28rem]",
                discoverOwnPlacementBadgeGlowClass(rank),
              )}
              aria-hidden
            >
              #{rank}
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em]",
                  hasRank
                    ? topThree
                      ? "bg-amber-400/20 text-amber-100 ring-1 ring-amber-400/35"
                      : "bg-sky-400/15 text-sky-100 ring-1 ring-sky-400/30"
                    : "bg-white/10 text-zinc-300 ring-1 ring-white/15",
                )}
              >
                Du
              </span>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Deine Platzierung
              </p>
            </div>
            {hasRank ? (
              <p className="mt-1 text-[1.02rem] font-bold leading-snug tracking-tight text-white">
                {topThree && rank === 1
                  ? "Build of the Week"
                  : `Platz ${rank} diese Woche`}
              </p>
            ) : (
              <p className="mt-0.5 text-[0.88rem] font-medium text-zinc-200">
                Noch kein Ranking
              </p>
            )}
            {hasRank && ownWeeklyRank ? (
              <p
                className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.78rem] text-zinc-400"
              >
                <span
                  className="inline-flex items-center gap-1 font-mono tabular-nums text-amber-400/95"
                >
                  <Heart className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {ownWeeklyRank.weeklyLikes} {likeWord}
                </span>
                {secondary ? (
                  <>
                    <span className="text-zinc-600" aria-hidden>·</span>
                    <span>{secondary}</span>
                  </>
                ) : null}
              </p>
            ) : secondary ? (
              <p className="mt-1 text-[0.78rem] text-zinc-400">{secondary}</p>
            ) : null}
          </div>

          {shareCardData ? (
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/15 transition active:scale-95"
              aria-label="Rang teilen"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {shareCardData ? (
        <EgoShareSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          cardData={shareCardData}
          vehicleId={vehicleId}
        />
      ) : null}
    </>
  );
}
