"use client";

import { ShareableSpecCard } from "@/components/shareable-spec-card";
import type { ShareableBuildData } from "@/components/shareable-spec-card/types";

type ShowcaseTopThreeStoryShareProps = {
  cardData: ShareableBuildData;
  className?: string;
};

export function ShowcaseTopThreeStoryShare({
  cardData,
  className,
}: ShowcaseTopThreeStoryShareProps) {
  return (
    <div className={className}>
      <div className="space-y-1 px-4">
        <h2 className="text-[0.98rem] font-semibold text-[color:var(--vd-text)]">
          Rang teilen
        </h2>
        <p className="text-[0.82rem] leading-snug text-[color:var(--vd-muted)]">
          9:16 für Instagram Stories — mit deiner Wochenplatzierung.
        </p>
      </div>
      <ShareableSpecCard
        data={cardData}
        previewMaxWidth={280}
        className="mt-5 w-full px-4"
      />
    </div>
  );
}
