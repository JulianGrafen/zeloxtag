"use client";

import { Flame } from "lucide-react";
import { toast } from "sonner";

import { formatShowcaseSwipeDailyStatsLine } from "@/lib/showcase/showcase-swipe-daily-stats-copy";
import type { VehicleShowcaseSwipeDailyStats } from "@/lib/showcase/vehicle-showcase-swipe-daily-stats-map";

export const SHOWCASE_DAILY_STATS_TOAST_DURATION_MS = 5500;

const SHOWCASE_DAILY_STATS_TOAST_CLASS =
  "!border-white/20 !bg-black/55 !text-white shadow-2xl backdrop-blur-xl backdrop-saturate-150";

export function showShowcaseSwipeDailyStatsToast(
  stats: Pick<VehicleShowcaseSwipeDailyStats, "swipeCount" | "likeRatePercent">,
): void {
  toast(formatShowcaseSwipeDailyStatsLine(stats), {
    duration: SHOWCASE_DAILY_STATS_TOAST_DURATION_MS,
    icon: <Flame className="h-4 w-4 shrink-0 text-orange-300" aria-hidden />,
    classNames: {
      toast: SHOWCASE_DAILY_STATS_TOAST_CLASS,
      title: "!text-white text-[0.92rem] font-semibold leading-snug",
    },
  });
}
