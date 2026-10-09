import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import { cn } from "@/lib/utils";

function rankAccentClass(rank: TopThreeWeeklyRank): string {
  switch (rank) {
    case 1:
      return "text-amber-300 ring-amber-400/40";
    case 2:
      return "text-zinc-200 ring-zinc-300/30";
    case 3:
      return "text-orange-300 ring-orange-600/35";
    default:
      return "text-white ring-white/15";
  }
}

type ShareCardWeeklyRankBadgeProps = {
  rank: TopThreeWeeklyRank;
  className?: string;
};

export function ShareCardWeeklyRankBadge({
  rank,
  className,
}: ShareCardWeeklyRankBadgeProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2",
        className,
      )}
    >
      <div
        className={cn(
          "inline-flex items-center rounded-xl bg-black/60 px-5 py-2.5 font-mono text-[52px] font-bold tabular-nums tracking-tight text-white ring-1 backdrop-blur-md",
          rankAccentClass(rank),
        )}
      >
        #{rank}
      </div>
      {rank === 1 ? (
        <p
          className="max-w-[min(100%,22rem)] text-[26px] font-semibold uppercase leading-tight tracking-[0.12em] text-amber-200/95"
        >
          Build of the Week
        </p>
      ) : null}
    </div>
  );
}
