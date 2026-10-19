"use client";

import { BuildDnaRadarChart } from "@/components/public-showcase/BuildDnaRadarChart";
import { ShowroomBuildPersonalityChips } from "@/components/public-showcase/ShowroomBuildPersonalityChips";
import { ShowroomQuartettBar } from "@/components/public-showcase/ShowroomQuartettBar";
import { buildQuartettLines } from "@/lib/showcase/build-quartett-lines";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";

type SwipeCardDetailsContentProps = {
  card: ShowcaseSwipeCard;
  showVehicleHeader?: boolean;
};

function buildSwipeQuartettLines(card: ShowcaseSwipeCard) {
  return buildQuartettLines({
    powerPs: card.powerPs,
    torqueNm: card.torqueNm,
    accel0To100Sec: card.accel0To100Sec,
    accel100To200Sec: card.accel100To200Sec,
    maxLines: 4,
  });
}

export function SwipeCardDetailsContent({
  card,
  showVehicleHeader = true,
}: SwipeCardDetailsContentProps) {
  const title = [card.make, card.model].filter(Boolean).join(" ");
  const lines = buildSwipeQuartettLines(card);

  return (
    <div className="flex flex-col gap-5 pb-4 text-white">
      {showVehicleHeader ? (
        <div>
          <p className="text-[1.05rem] font-semibold tracking-tight">{title}</p>
          {card.year != null ? (
            <p className="text-[0.82rem] text-zinc-400">{card.year}</p>
          ) : null}
        </div>
      ) : null}

      {card.buildPersonalityLabels.length > 0 ? (
        <ShowroomBuildPersonalityChips
          labels={card.buildPersonalityLabels}
          compact
          className="justify-start"
        />
      ) : null}

      {lines.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {lines.map((line) => (
            <li key={line.label} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2 text-[0.82rem]">
                <span className="text-white/55">{line.label}</span>
                <span className="font-medium tabular-nums">{line.value}</span>
              </div>
              <ShowroomQuartettBar filled={line.filled} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[0.85rem] text-white/45">
          Keine technischen Specs hinterlegt.
        </p>
      )}

      {card.buildDna ? (
        <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4">
          <p className="text-center text-[0.85rem] font-semibold tracking-tight text-white/90">
            {card.buildDna.archetype}
          </p>
          <div className="mx-auto mt-2 max-w-[220px]">
            <BuildDnaRadarChart
              dna={card.buildDna}
              variant="compact"
              animate={false}
            />
          </div>
          <p className="mt-2 text-center text-[0.78rem] leading-snug text-white/50">
            {card.buildDna.punchline}
          </p>
        </div>
      ) : null}
    </div>
  );
}
