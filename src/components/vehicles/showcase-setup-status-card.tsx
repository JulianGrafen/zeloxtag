"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronRight, Sparkles } from "lucide-react";

import { IOS_CARD, IOS_ROW_PRESSED } from "@/components/ui/ios";
import { cn } from "@/lib/utils";
import type { ShowcaseSetupProgress } from "@/lib/vehicles/showcase-setup-progress";

type ShowcaseSetupStatusCardProps = {
  vehicleTitle: string;
  isPublic: boolean;
  progress: ShowcaseSetupProgress;
  /** Where the next open step lives; omitted when everything is done. */
  nextStepHref: string | null;
  /** Public showcase URL for a quick preview (only when public). */
  previewHref: string | null;
  canEdit: boolean;
};

/** Hub header: visibility, completeness and the single most useful next action. */
export function ShowcaseSetupStatusCard({
  vehicleTitle,
  isPublic,
  progress,
  nextStepHref,
  previewHref,
  canEdit,
}: ShowcaseSetupStatusCardProps) {
  const { doneCount, totalCount, percent, nextStep, steps } = progress;
  const isComplete = nextStep == null;

  return (
    <section data-ios-ui className={cn("ios-ui overflow-hidden", IOS_CARD)}>
      <div className="px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8E8E93]">
              Dein Showcase
            </p>
            <h2 className="mt-1 truncate font-[family-name:var(--font-display)] text-[20px] font-semibold tracking-[-0.02em] text-white">
              {vehicleTitle}
            </h2>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              isPublic
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-white/[0.08] text-[#EBEBF5]",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isPublic ? "bg-emerald-400" : "bg-[#8E8E93]",
              )}
            />
            {isPublic ? "Öffentlich" : "Privat"}
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-[#8E8E93]">
              {isComplete ? "Alles gepflegt" : "Vollständigkeit"}
            </span>
            <span className="tabular-nums font-medium text-white">
              {doneCount}/{totalCount}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Showcase-Vollständigkeit"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]"
          >
            <div
              className="h-full rounded-full bg-white transition-[width] duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Bereiche">
            {steps.map((step) => (
              <li
                key={step.id}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  step.done
                    ? "bg-white/[0.1] text-white"
                    : "border border-white/[0.08] text-[#8E8E93]",
                )}
              >
                {step.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {canEdit && nextStep && nextStepHref ? (
        <Link
          href={nextStepHref}
          className={cn(
            "flex min-h-[48px] items-center gap-3 border-t border-white/[0.08] px-4 py-3",
            IOS_ROW_PRESSED,
          )}
        >
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0A84FF]/15 text-[#0A84FF]"
          >
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-[#8E8E93]">Nächster Schritt</span>
            <span className="block text-[15px] font-medium text-white">
              {nextStep.action}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#48484A]" aria-hidden />
        </Link>
      ) : null}

      {previewHref ? (
        <Link
          href={previewHref}
          target="_blank"
          rel="noopener"
          className={cn(
            "flex min-h-[44px] items-center justify-center gap-1.5 border-t border-white/[0.08] px-4 py-3 text-[15px] font-medium text-[#0A84FF]",
            IOS_ROW_PRESSED,
          )}
        >
          Showcase ansehen
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}
    </section>
  );
}
