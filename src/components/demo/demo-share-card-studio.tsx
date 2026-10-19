"use client";

import { useMemo, useState } from "react";

import { ShareCardComposer } from "@/components/shareable-spec-card/ShareCardComposer";
import { buildDemoShareCardData } from "@/lib/demo/demo-share-card-data";
import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import { cn } from "@/lib/utils";

const RANK_OPTIONS: TopThreeWeeklyRank[] = [1, 2, 3];

type DemoShareCardStudioProps = {
  className?: string;
};

export function DemoShareCardStudio({ className }: DemoShareCardStudioProps) {
  const [rank, setRank] = useState<TopThreeWeeklyRank>(1);

  const cardData = useMemo(() => buildDemoShareCardData(rank), [rank]);

  if (!cardData) {
    return (
      <p className="text-[0.82rem] text-zinc-500">
        Demo-Daten konnten nicht geladen werden.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <label className="flex flex-col gap-2">
        <span className="text-[0.78rem] font-medium uppercase tracking-wider text-zinc-500">
          Wochenplatzierung (Demo)
        </span>
        <select
          className="min-h-11 rounded-xl border border-white/15 bg-zinc-900 px-3 text-[0.88rem] text-white"
          value={rank}
          onChange={(event) =>
            setRank(Number(event.target.value) as TopThreeWeeklyRank)
          }
        >
          {RANK_OPTIONS.map((option) => (
            <option key={option} value={option}>
              Platz {option}
            </option>
          ))}
        </select>
      </label>

      <ShareCardComposer
        data={cardData}
        previewMaxWidth={320}
        defaultFormat="story"
        defaultStyle="rankHero"
        persistVariant={false}
        showExportButton
      />
    </div>
  );
}
