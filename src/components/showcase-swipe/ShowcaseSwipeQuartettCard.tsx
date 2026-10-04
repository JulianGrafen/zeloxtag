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

type ShowcaseSwipeQuartettCardProps = {
  card: ShowcaseSwipeCard;
  className?: string;
};

export function ShowcaseSwipeQuartettCard({
  card,
  className,
}: ShowcaseSwipeQuartettCardProps) {
  const title = [card.make, card.model].filter(Boolean).join(" ");
  const yearLabel = card.year != null ? String(card.year) : null;
  const lines = buildSwipeQuartettLines(card);
  const modLabel =
    card.modificationCount > 0
      ? `${card.modificationCount} Umbauten`
      : "Showcase";

  return (
    <div
      className={cn(
        "relative flex h-full w-full min-h-0 flex-col overflow-hidden rounded-3xl bg-neutral-950 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/10",
        className,
      )}
    >
      <div className="relative min-h-0 w-full shrink-0 flex-[3] bg-neutral-900">
        {card.heroImageSrc ? (
          <Image
            src={card.heroImageSrc}
            alt={title}
            fill
            draggable={false}
            className="pointer-events-none object-cover object-center"
            sizes="(max-width: 512px) 100vw, 480px"
            unoptimized={card.heroImageSrc.startsWith("/api/")}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[0.85rem] text-white/50">
            Kein Fahrzeugbild
          </div>
        )}
        {card.totalLikes > 0 ? (
          <div
            className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 ring-1 ring-white/15 backdrop-blur-md"
            aria-label={`${card.totalLikes} Likes`}
          >
            <Heart
              className="h-3.5 w-3.5 text-rose-400"
              fill="currentColor"
              aria-hidden
            />
            <span className="font-mono text-[0.78rem] font-semibold tabular-nums tracking-tight text-white">
              {card.totalLikes}
            </span>
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-neutral-950 to-transparent" />
      </div>

      <div className="flex min-h-0 flex-[2] flex-col gap-2.5 overflow-y-auto px-4 pb-4 pt-2.5 overscroll-contain touch-pan-y">
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
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
            <p className="text-center text-[0.78rem] font-semibold tracking-tight text-white/90">
              {card.buildDna.archetype}
            </p>
            <div className="mt-1 max-w-[200px] mx-auto">
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

        <p className="mt-auto text-center text-[0.72rem] text-white/40">
          Tippen · Showcase öffnen
        </p>
      </div>
    </div>
  );
}
