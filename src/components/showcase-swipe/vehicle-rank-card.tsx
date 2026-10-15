import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

import { showcaseVehicleFocusImageClassName } from "@/lib/image/showcase-vehicle-focus-image";
import { buildDiscoverShowcaseHref } from "@/lib/showcase/discover-showcase-navigation";
import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";
import { cn } from "@/lib/utils";

function rankBadgeClass(rank: number): string {
  const base =
    "absolute left-3 top-3 z-10 flex h-8 min-w-8 items-center justify-center rounded-lg px-2 font-mono text-sm font-semibold tabular-nums tracking-tight ring-1 backdrop-blur-md";
  if (rank === 1) {
    return cn(
      base,
      "bg-black/45 text-amber-100 ring-amber-400/45",
    );
  }
  if (rank === 2) {
    return cn(base, "bg-black/45 text-zinc-100 ring-zinc-300/35");
  }
  if (rank === 3) {
    return cn(
      base,
      "bg-black/45 text-orange-100/95 ring-orange-500/40",
    );
  }
  return cn(base, "bg-black/45 text-white ring-white/20");
}

type VehicleRankCardProps = {
  build: WeeklyTopBuild;
  entdeckenReturnHref: string;
  className?: string;
};

export function VehicleRankCard({
  build,
  entdeckenReturnHref,
  className,
}: VehicleRankCardProps) {
  const title = [build.make, build.model].filter(Boolean).join(" ");

  return (
    <Link
      href={buildDiscoverShowcaseHref(build.publicSlug, entdeckenReturnHref)}
      className={cn(
        "group relative flex w-[min(58vw,11.25rem)] shrink-0 snap-start overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-[0_14px_36px_rgba(0,0,0,0.38)] ring-1 ring-white/10",
        "transition-transform duration-200 active:scale-[0.98]",
        className,
      )}
    >
      <div className="relative aspect-[3/4] w-full">
        {build.heroImageSrc ? (
          <Image
            src={build.heroImageSrc}
            alt={title}
            fill
            className={showcaseVehicleFocusImageClassName(
              build.heroImageSrc,
              "rankCard",
            )}
            sizes="180px"
            unoptimized={build.heroImageSrc.startsWith("/api/")}
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-900" aria-hidden />
        )}

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"
          aria-hidden
        />

        <div className={rankBadgeClass(build.rank)}>#{build.rank}</div>

        {!build.heroImageSrc ? (
          <div className="absolute inset-0 flex items-center justify-center text-[0.72rem] text-white/45">
            Kein Bild
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 z-10 p-3.5">
          <p className="truncate text-[0.92rem] font-semibold leading-tight tracking-tight">
            {title}
          </p>
          {build.year != null ? (
            <p className="mt-0.5 font-mono text-[0.72rem] tabular-nums tracking-tight text-white/55">
              {build.year}
            </p>
          ) : null}
          <p
            className="mt-2 flex items-center gap-1.5 font-mono text-[0.78rem] font-medium tabular-nums tracking-tight text-white/90"
          >
            <Heart
              className="h-3.5 w-3.5 shrink-0 text-rose-400"
              fill="currentColor"
              aria-hidden
            />
            {build.weeklyLikes}
            <span className="text-[0.65rem] font-normal text-white/50">
              diese Woche
            </span>
          </p>
        </div>
      </div>
    </Link>
  );
}
