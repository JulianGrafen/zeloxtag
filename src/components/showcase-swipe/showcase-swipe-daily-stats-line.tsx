import { Flame } from "lucide-react";

import { formatShowcaseSwipeDailyStatsLine } from "@/lib/showcase/showcase-swipe-daily-stats-copy";
import type { VehicleShowcaseSwipeDailyStats } from "@/lib/showcase/vehicle-showcase-swipe-daily-stats-map";
import { cn } from "@/lib/utils";

type ShowcaseSwipeDailyStatsLineProps = {
  stats: VehicleShowcaseSwipeDailyStats;
  className?: string;
};

export function ShowcaseSwipeDailyStatsLine({
  stats,
  className,
}: ShowcaseSwipeDailyStatsLineProps) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-xl border border-orange-500/25 bg-orange-950/25 px-3.5 py-3 text-[0.88rem] font-medium leading-snug text-[color:var(--vd-text)]",
        className,
      )}
    >
      <Flame
        className="mt-0.5 size-4 shrink-0 text-orange-400"
        aria-hidden
      />
      <span>{formatShowcaseSwipeDailyStatsLine(stats)}</span>
    </p>
  );
}
