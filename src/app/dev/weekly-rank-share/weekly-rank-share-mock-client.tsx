"use client";

import { ShareableSpecCard } from "@/components/shareable-spec-card";
import { ShareCardWeeklyRankBadge } from "@/components/shareable-spec-card/ShareCardWeeklyRankBadge";
import { ShowcaseWeeklyRankCelebration } from "@/components/showcase-swipe/showcase-weekly-rank-celebration";
import {
  mockWeeklyRankAward,
  mockWeeklyRankShareCard,
} from "@/lib/showcase/weekly-rank-share-mock-data";
import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";

const RANKS: TopThreeWeeklyRank[] = [1, 2, 3];

export function WeeklyRankShareMockClient() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-10 bg-[#0a0a0a] px-4 py-8 text-white">
      <header className="space-y-1">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.2em] text-zinc-500">
          Dev mock
        </p>
        <h1 className="text-xl font-semibold tracking-tight">
          Platzierungs-Story-Karte
        </h1>
        <p className="text-[0.85rem] leading-snug text-zinc-400">
          Wie nach Wochenende auf Entdecken — inkl. Badge-Varianten Platz 1–3.
        </p>
      </header>

      <ShowcaseWeeklyRankCelebration
        award={mockWeeklyRankAward(1)}
        shareCardData={mockWeeklyRankShareCard(1)}
        initiallyExpanded
      />

      <section className="space-y-4">
        <h2 className="text-[0.9rem] font-semibold text-zinc-200">
          Badge-Vergleich
        </h2>
        <div className="flex flex-col gap-3">
          {RANKS.map((rank) => (
            <ShareCardWeeklyRankBadge key={rank} rank={rank} />
          ))}
        </div>
      </section>

      <section className="space-y-6 border-t border-white/10 pt-8">
        {RANKS.map((rank) => (
          <div key={rank} className="space-y-3">
            <h2 className="text-[0.9rem] font-semibold text-zinc-200">
              Story-Vorschau · Platz {rank}
            </h2>
            <ShareableSpecCard
              data={mockWeeklyRankShareCard(rank)}
              previewMaxWidth={280}
              showExportButton={false}
              className="w-full"
            />
          </div>
        ))}
      </section>
    </div>
  );
}
