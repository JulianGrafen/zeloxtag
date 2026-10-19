"use client";

import { useCallback, useState, useTransition } from "react";
import { Sparkles, X } from "lucide-react";

import { ShareableSpecCard } from "@/components/shareable-spec-card";
import type { ShareableBuildData } from "@/components/shareable-spec-card/types";
import { apiFetch } from "@/lib/api/api-fetch";
import { weeklyRankAwardHeadline } from "@/lib/showcase/weekly-rank-award-keys";
import {
  WEEKLY_RANK_CELEBRATION_BODY,
  WEEKLY_RANK_STORY_EXPORT_HINT,
  WEEKLY_RANK_STORY_EXPORT_LABEL,
  WEEKLY_RANK_STORY_EXPORT_PENDING_LABEL,
  WEEKLY_RANK_STORY_OPEN_CTA,
} from "@/lib/showcase/weekly-rank-story-share-copy";
import type { ShowcaseWeeklyRankAward } from "@/lib/showcase/weekly-rank-award-types";
import { cn } from "@/lib/utils";

type ShowcaseWeeklyRankCelebrationProps = {
  award: ShowcaseWeeklyRankAward;
  shareCardData: ShareableBuildData;
  className?: string;
  /** Auto-open when landing from email CTA. */
  initiallyExpanded?: boolean;
};

async function markAwardSeen(awardId: string): Promise<void> {
  await apiFetch("/api/showcase/weekly-award/seen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ awardId }),
  });
}

export function ShowcaseWeeklyRankCelebration({
  award,
  shareCardData,
  className,
  initiallyExpanded = false,
}: ShowcaseWeeklyRankCelebrationProps) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [pending, startTransition] = useTransition();

  const dismiss = useCallback(() => {
    startTransition(async () => {
      await markAwardSeen(award.id);
      setDismissed(true);
    });
  }, [award.id]);

  if (dismissed) return null;

  const headline = weeklyRankAwardHeadline(award.rank);
  const likeWord = award.weeklyLikes === 1 ? "Like" : "Likes";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]/80 p-4 shadow-[var(--vd-shadow-sm)]",
        className,
      )}
      aria-labelledby="weekly-rank-celebration-title"
    >
      <button
        type="button"
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-muted)]"
        aria-label="Schließen"
        disabled={pending}
        onClick={() => void dismiss()}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <div className="flex items-start gap-3 pr-10">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p
            id="weekly-rank-celebration-title"
            className="text-[0.98rem] font-semibold text-[color:var(--vd-text)]"
          >
            {headline}
          </p>
          <p className="mt-1 text-[0.82rem] leading-snug text-[color:var(--vd-muted)]">
            Platz {award.rank} · {award.weeklyLikes} {likeWord} (
            {award.weekKey}). {WEEKLY_RANK_CELEBRATION_BODY}
          </p>
        </div>
      </div>

      {expanded ? (
        <div className="mt-5 border-t border-[color:var(--vd-border)] pt-5">
          <ShareableSpecCard
            data={shareCardData}
            vehicleId={award.vehicleId}
            previewMaxWidth={280}
            className="w-full"
            defaultFormat="story"
            defaultStyle="rankHero"
            exportButtonLabel={WEEKLY_RANK_STORY_EXPORT_LABEL}
            exportButtonPendingLabel={WEEKLY_RANK_STORY_EXPORT_PENDING_LABEL}
            exportHint={WEEKLY_RANK_STORY_EXPORT_HINT}
          />
          <button
            type="button"
            className="mt-4 w-full text-center text-[0.8rem] font-medium text-[color:var(--vd-muted)]"
            disabled={pending}
            onClick={() => void dismiss()}
          >
            Später
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="mt-4 w-full min-h-11 rounded-xl bg-[color:var(--vd-text)] text-[0.88rem] font-semibold text-[color:var(--vd-surface)]"
          onClick={() => setExpanded(true)}
        >
          {WEEKLY_RANK_STORY_OPEN_CTA}
        </button>
      )}
    </section>
  );
}
