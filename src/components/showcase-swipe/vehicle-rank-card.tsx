import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";
import { cn } from "@/lib/utils";

export type RankAccent = "gold" | "silver" | "bronze" | "default";

function accentClasses(accent: RankAccent): string {
  switch (accent) {
    case "gold":
      return "border-amber-400/35 from-amber-950/40 to-black";
    case "silver":
      return "border-zinc-300/25 from-zinc-800/50 to-black";
    case "bronze":
      return "border-orange-700/35 from-orange-950/30 to-black";
    default:
      return "border-white/[0.08] from-zinc-900 to-black";
  }
}

function rankAccent(rank: number): RankAccent {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "default";
}

type VehicleRankCardProps = {
  build: WeeklyTopBuild;
  className?: string;
};

export function VehicleRankCard({ build, className }: VehicleRankCardProps) {
  const title = [build.make, build.model].filter(Boolean).join(" ");
  const accent = rankAccent(build.rank);

  return (
    <Link
      href={`/v/${build.publicSlug}`}
      className={cn(
        "group flex w-[min(72vw,17rem)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-gradient-to-b backdrop-blur-md",
        "border-t border-white/[0.1] shadow-[0_12px_40px_rgba(0,0,0,0.35)]",
        "transition-transform duration-200 active:scale-[0.98]",
        accentClasses(accent),
        className,
      )}
    >
      <div className="relative aspect-[16/10] bg-zinc-950/80">
        {build.heroImageSrc ? (
          <Image
            src={build.heroImageSrc}
            alt={title}
            fill
            className="object-contain object-center p-3"
            sizes="272px"
            unoptimized={build.heroImageSrc.startsWith("/api/")}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[0.72rem] text-zinc-500">
            Kein Bild
          </div>
        )}
        <div
          className={cn(
            "absolute left-3 top-3 flex h-8 min-w-8 items-center justify-center rounded-lg px-2",
            "bg-black/55 font-mono text-sm font-semibold tabular-nums tracking-tight text-white ring-1 ring-white/15 backdrop-blur-sm",
          )}
        >
          #{build.rank}
        </div>
      </div>

      <div className="flex flex-col gap-1 px-3.5 py-3">
        <p className="truncate text-[0.9rem] font-semibold text-zinc-100">
          {title}
        </p>
        {build.year != null ? (
          <p className="font-mono text-[0.72rem] tabular-nums tracking-tight text-zinc-500">
            {build.year}
          </p>
        ) : null}
        <p
          className="mt-1 flex items-center gap-1.5 font-mono text-[0.8rem] font-medium tabular-nums tracking-tight text-amber-400/95"
        >
          <Heart className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {build.weeklyLikes}
          <span className="text-[0.68rem] font-normal text-zinc-500">
            diese Woche
          </span>
        </p>
      </div>
    </Link>
  );
}
