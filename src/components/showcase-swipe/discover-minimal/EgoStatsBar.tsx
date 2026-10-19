"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

import type { ShareableBuildData } from "@/components/shareable-spec-card/types";
import {
  buildEgoStatsSegments,
  egoStatsDisplayParts,
} from "@/lib/showcase/format-ego-stats";
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

export function EgoStatsBar({
  ownWeeklyRank,
  dailySwipeStats,
  shareCardData,
  vehicleId,
  className,
}: EgoStatsBarProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const parts = egoStatsDisplayParts(
    buildEgoStatsSegments(ownWeeklyRank, dailySwipeStats),
  );

  if (parts.length === 0 && !shareCardData) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-30 mx-auto mb-1 flex w-full max-w-lg items-center gap-2 rounded-full bg-zinc-900/70 px-4 py-2.5 ring-1 ring-white/10 backdrop-blur-md",
          className,
        )}
      >
        <p className="min-w-0 flex-1 truncate text-center text-[0.78rem] font-medium text-zinc-200">
          {parts.length > 0 ? parts.join(" • ") : "Dein Build"}
        </p>
        {shareCardData ? (
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition active:scale-95"
            aria-label="Rang teilen"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <span className="h-9 w-9 shrink-0" aria-hidden />
        )}
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
