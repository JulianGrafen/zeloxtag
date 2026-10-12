"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

import {
  formatTimelineChronikDate,
  formatTimelineCost,
  formatTimelineMileage,
} from "@/lib/documents/timeline-format";
import {
  TIMELINE_CATEGORY_LABELS,
  type TimelineEvent,
} from "@/lib/validations/timelineSchema";
import {
  PressableButton,
  PressableLink,
} from "@/components/vehicle-dashboard/Pressable";
import { cn } from "@/lib/utils";

const SHEET_EASE = [0.22, 1, 0.36, 1] as const;

export type TimelineEventDetailSheetProps = {
  open: boolean;
  event: TimelineEvent | null;
  documentHref?: string | null;
  onClose: () => void;
};

export function TimelineEventDetailSheet({
  open,
  event,
  documentHref,
  onClose,
}: TimelineEventDetailSheetProps) {
  const reduceMotion = useReducedMotion();

  const sheetMotion = reduceMotion
    ? { initial: false as const, animate: { y: 0 }, exit: { y: 0 } }
    : {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
        transition: { duration: 0.34, ease: SHEET_EASE },
      };

  if (!event) return null;

  const costLabel = formatTimelineCost(event.cost);
  const dateLabel = formatTimelineChronikDate(event.date);
  const mileageLabel = formatTimelineMileage(event.mileage, {
    known: event.mileageKnown,
  });
  const categoryLabel = TIMELINE_CATEGORY_LABELS[event.category];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="pointer-events-auto fixed inset-0 z-[108] flex items-end justify-center bg-black/55 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="timeline-event-detail-title"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            {...sheetMotion}
            className={cn(
              "w-full max-w-lg rounded-t-[1.35rem] border border-white/[0.08] border-b-0",
              "bg-gradient-to-b from-zinc-900 to-zinc-950 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4",
              "shadow-[0_-24px_80px_rgba(0,0,0,0.55)]",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-zinc-500">
                  {categoryLabel}
                  {event.isManualEntry ? " · Manuell" : null}
                </p>
                <h2
                  id="timeline-event-detail-title"
                  className="font-[family-name:var(--font-display)] text-[1.15rem] font-semibold leading-snug tracking-[-0.03em] text-zinc-100"
                >
                  {event.title}
                </h2>
              </div>
              <PressableButton
                type="button"
                variant="pill"
                className="shrink-0 rounded-full border border-white/10 bg-zinc-900/80 p-2 text-zinc-400"
                aria-label="Schließen"
                onClick={onClose}
              >
                <X className="h-4 w-4" aria-hidden />
              </PressableButton>
            </div>

            <dl className="space-y-2.5 text-[0.84rem]">
              {dateLabel ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Datum</dt>
                  <dd className="text-right font-medium text-zinc-200 tabular-nums">
                    {dateLabel}
                  </dd>
                </div>
              ) : null}
              {event.mileageKnown !== false ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Kilometerstand</dt>
                  <dd className="text-right font-medium text-zinc-200 tabular-nums">
                    {mileageLabel}
                  </dd>
                </div>
              ) : null}
              {costLabel ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Kosten</dt>
                  <dd className="text-right font-medium text-zinc-200 tabular-nums">
                    {costLabel}
                  </dd>
                </div>
              ) : null}
            </dl>

            {event.description ? (
              <div className="mt-4 rounded-2xl border border-white/[0.06] bg-zinc-950/60 px-4 py-3">
                <p className="text-[0.72rem] font-medium uppercase tracking-[0.1em] text-zinc-500">
                  Details
                </p>
                <p className="mt-2 whitespace-pre-wrap text-[0.88rem] leading-relaxed text-zinc-300">
                  {event.description}
                </p>
              </div>
            ) : null}

            {documentHref ? (
              <PressableLink
                href={documentHref}
                variant="button"
                className="mt-5 flex w-full min-h-[48px] items-center justify-center rounded-2xl border border-white/10 bg-white text-[0.92rem] font-semibold text-zinc-950 no-underline"
                onClick={onClose}
              >
                Beleg öffnen
              </PressableLink>
            ) : (
              <PressableButton
                type="button"
                variant="button"
                className="mt-5 flex w-full min-h-[48px] items-center justify-center rounded-2xl border border-white/10 bg-zinc-800 text-[0.92rem] font-semibold text-zinc-100"
                onClick={onClose}
              >
                Schließen
              </PressableButton>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
