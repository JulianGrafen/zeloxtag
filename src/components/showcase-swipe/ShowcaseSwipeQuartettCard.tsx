"use client";

import Image from "next/image";
import { Heart } from "lucide-react";

import { BuildDnaRadarChart } from "@/components/public-showcase/BuildDnaRadarChart";
import { ShowroomBuildPersonalityChips } from "@/components/public-showcase/ShowroomBuildPersonalityChips";
import { ShowroomQuartettBar } from "@/components/public-showcase/ShowroomQuartettBar";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";
import { buildQuartettLines } from "@/lib/showcase/build-quartett-lines";
import { cn } from "@/lib/utils";

function buildSwipeQuartettLines(card: ShowcaseSwipeCard) {
  return buildQuartettLines({
    powerPs: card.powerPs,
    torqueNm: card.torqueNm,
    accel0To100Sec: card.accel0To100Sec,
    accel100To200Sec: card.accel100To200Sec,
    maxLines: 4,
  });
}

function swipeCardHeroUsesCoverLayout(src: string): boolean {
  if (src.includes(".svg") || src.includes("dyno-chart")) {
    return false;
  }
  if (src.includes("/api/vehicle/catalog/")) {
    return false;
  }
  return true;
}

function swipeCardHeroImageClassName(src: string): string {
  if (swipeCardHeroUsesCoverLayout(src)) {
    return "object-cover object-[50%_55%]";
  }
  return "object-contain object-bottom px-3 pb-[14%] pt-6";
}

type ShowcaseSwipeQuartettCardProps = {
  card: ShowcaseSwipeCard;
  className?: string;
  imagePriority?: boolean;
};

export function ShowcaseSwipeQuartettCard({
  card,
  className,
  imagePriority = false,
}: ShowcaseSwipeQuartettCardProps) {
  const title = [card.make, card.model].filter(Boolean).join(" ");
  const yearLabel = card.year != null ? String(card.year) : null;
  const lines = buildSwipeQuartettLines(card);
  const modLabel =
    card.modificationCount > 0
      ? `${card.modificationCount} Umbauten`
      : "Showcase";
  const heroSrc = card.heroImageSrc?.trim() ?? "";
  const heroCoversCard = heroSrc ? swipeCardHeroUsesCoverLayout(heroSrc) : false;

  return (
    <div
      className={cn(
        "relative flex h-full w-full min-h-0 flex-col overflow-hidden rounded-3xl bg-neutral-950 text-white shadow-[0_16px_40px_rgba(0,0,0,0.38)] ring-1 ring-white/10",
        className,
      )}
    >
      {heroSrc ? (
        <Image
          src={heroSrc}
          alt={title}
          fill
          draggable={false}
          priority={imagePriority}
          loading={imagePriority ? "eager" : "lazy"}
          className={cn(
            "pointer-events-none z-0",
            swipeCardHeroImageClassName(heroSrc),
          )}
          style={heroCoversCard ? { objectFit: "cover" } : { objectFit: "contain" }}
          sizes="(max-width: 512px) 100vw, 480px"
          unoptimized={heroSrc.startsWith("/api/")}
        />
      ) : (
        <div className="absolute inset-0 z-0 bg-neutral-900" aria-hidden />
      )}

      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/50 via-black/15 to-neutral-950"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[min(68%,22rem)] bg-gradient-to-t from-neutral-950 from-[18%] via-neutral-950/90 to-transparent"
        aria-hidden
      />

      {card.totalLikes > 0 ? (
        <div
          className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 ring-1 ring-white/15 backdrop-blur-md"
          aria-label={`${card.totalLikes} Likes gesamt`}
        >
          <Heart
            className="h-3.5 w-3.5 text-rose-400"
            fill="currentColor"
            aria-hidden
          />
          <span className="font-mono text-[0.78rem] font-semibold tabular-nums tracking-tight text-white">
            {card.totalLikes}
            <span className="ml-1 text-[0.62rem] font-normal text-white/55">
              gesamt
            </span>
          </span>
        </div>
      ) : null}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-end gap-2.5 overflow-hidden px-4 pb-[7.25rem] pt-14">
        <div>
          <p className="text-[1.05rem] font-semibold tracking-tight">{title}</p>
          <p className="text-[0.78rem] text-white/55">
            {[yearLabel, modLabel].filter(Boolean).join(" · ")}
          </p>
          {card.buildPersonalityLabels.length > 0 ? (
            <ShowroomBuildPersonalityChips
              labels={card.buildPersonalityLabels}
              compact
              className="mt-2"
            />
          ) : null}
        </div>

        {lines.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {lines.map((line) => (
              <li key={line.label} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-[0.72rem]">
                  <span className="text-white/55">{line.label}</span>
                  <span className="font-medium tabular-nums">{line.value}</span>
                </div>
                <ShowroomQuartettBar filled={line.filled} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[0.8rem] text-white/45">
            Tippe für den vollen Showcase.
          </p>
        )}

        {card.buildDna ? (
          <div className="rounded-2xl border border-white/10 bg-black/35 px-3 py-3 backdrop-blur-sm">
            <p className="text-center text-[0.78rem] font-semibold tracking-tight text-white/90">
              {card.buildDna.archetype}
            </p>
            <div className="mx-auto mt-1 max-w-[200px]">
              <BuildDnaRadarChart
                dna={card.buildDna}
                variant="compact"
                animate={false}
              />
            </div>
            <p className="mt-1 line-clamp-2 text-center text-[0.68rem] leading-snug text-white/50">
              {card.buildDna.punchline}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
