import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import { weeklyRankAwardHeadline } from "@/lib/showcase/weekly-rank-award-keys";
import { cn } from "@/lib/utils";

function rankShellClass(rank: TopThreeWeeklyRank): string {
  switch (rank) {
    case 1:
      return "from-amber-500/25 via-amber-400/10 to-transparent ring-amber-300/45";
    case 2:
      return "from-zinc-300/20 via-zinc-400/8 to-transparent ring-zinc-200/35";
    case 3:
      return "from-orange-500/22 via-orange-400/8 to-transparent ring-orange-400/35";
    default:
      return "from-white/10 to-transparent ring-white/15";
  }
}

function rankNumberClass(rank: TopThreeWeeklyRank): string {
  switch (rank) {
    case 1:
      return "text-amber-100";
    case 2:
      return "text-zinc-100";
    case 3:
      return "text-orange-100";
    default:
      return "text-white";
  }
}

type ShareCardWeeklyRankBadgeProps = {
  rank: TopThreeWeeklyRank;
  className?: string;
};

/** Premium Story overlay: large rank + „Build der Woche“ headline beside it. */
export function ShareCardWeeklyRankBadge({
  rank,
  className,
}: ShareCardWeeklyRankBadgeProps) {
  const headline = weeklyRankAwardHeadline(rank);

  return (
    <div
      className={cn(
        "inline-flex max-w-[min(100%,38rem)] items-stretch gap-0 overflow-hidden rounded-[32px] bg-black/55 ring-1 backdrop-blur-xl",
        rankShellClass(rank),
        className,
      )}
    >
      <div
        className={cn(
          "flex min-w-[9.5rem] items-center justify-center bg-gradient-to-br px-6 py-5",
          rank === 1
            ? "from-amber-500/35 to-amber-950/40"
            : rank === 2
              ? "from-zinc-400/25 to-zinc-950/50"
              : "from-orange-600/30 to-neutral-950/50",
        )}
      >
        <span
          className={cn(
            "font-mono text-[142px] font-bold leading-none tabular-nums tracking-[-0.045em]",
            rankNumberClass(rank),
          )}
        >
          {rank}
        </span>
      </div>
      <div className="flex flex-col justify-center gap-2 border-l border-white/10 px-7 py-5">
        <p className="text-[14px] font-semibold uppercase tracking-[0.22em] text-white/55">
          ZeloxTag
        </p>
        <p
          className={cn(
            "text-[40px] font-semibold uppercase leading-[1.02] tracking-[0.05em]",
            rank === 1 ? "text-amber-100" : "text-white",
          )}
        >
          {headline}
        </p>
      </div>
    </div>
  );
}
