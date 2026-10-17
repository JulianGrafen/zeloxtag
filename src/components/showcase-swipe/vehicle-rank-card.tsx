import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

import { weeklyRankCardHeroImageClassName } from "@/lib/image/showcase-vehicle-focus-image";
import { buildDiscoverShowcaseHref } from "@/lib/showcase/discover-showcase-navigation";
import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";
import { cn } from "@/lib/utils";

function rankBadgeClass(rank: number): string {
  const base =
    "absolute left-3 top-3 z-20 flex h-8 min-w-8 items-center justify-center rounded-lg px-2 font-mono text-sm font-semibold tabular-nums tracking-tight ring-1 backdrop-blur-md";
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
  const heroSrc = build.heroImageSrc?.trim() || null;

  return (
    <Link
      href={buildDiscoverShowcaseHref(build.publicSlug, entdeckenReturnHref)}
      className={cn(
        "group relative flex w-[min(58vw,11.25rem)] shrink-0 snap-start overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-[0_14px_36px_rgba(0,0,0,0.38)] ring-1 ring-white/10",
        "transition-transform duration-200 active:scale-[0.98]",
        className,
      )}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-950">
        {heroSrc ? (
          <Image
            src={heroSrc}
            alt=""
            fill
            priority={build.rank <= 3}
            className={cn(
              "pointer-events-none transition-transform duration-300 group-active:scale-[1.03]",
              weeklyRankCardHeroImageClassName(
                heroSrc,
                build.heroImageUsesCover,
              ),
            )}
            sizes="180px"
            unoptimized={heroSrc.startsWith("/api/")}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[0.72rem] text-white/45">
            Kein Bild
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          aria-hidden
        >
          <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black via-black/90 to-transparent" />
        </div>

        <div className={rankBadgeClass(build.rank)}>#{build.rank}</div>

        <div className="absolute inset-x-0 bottom-0 z-10 p-3.5 pt-8">
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
            aria-label={`${build.weeklyLikes} Likes`}
          >
            <Heart
              className="h-3.5 w-3.5 shrink-0 text-rose-400"
              fill="currentColor"
              aria-hidden
            />
            {build.weeklyLikes}
          </p>
        </div>
        <span className="sr-only">{title}</span>
      </div>
    </Link>
  );
}
