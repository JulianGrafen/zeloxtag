"use client";

import { ChevronRight } from "lucide-react";

import {
  formatTimelineCost,
  formatTimelineDate,
  formatTimelineMileage,
} from "@/lib/documents/timeline-format";
import {
  TIMELINE_CATEGORY_LABELS,
  type TimelineEvent,
  type TimelineEventCategory,
} from "@/lib/validations/timelineSchema";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { cn } from "@/lib/utils";

/** Premium timeline card — machined surface, subtle depth. */
const TIMELINE_CARD_SHELL = cn(
  "min-w-0 rounded-2xl border border-white/[0.07] border-t border-white/[0.15]",
  "bg-gradient-to-b from-zinc-900/90 to-zinc-900/50 backdrop-blur-md",
  "p-4 shadow-[0_12px_40px_rgba(0,0,0,0.32)]",
  "transition-[box-shadow,transform,border-color] duration-200",
);

const TIMELINE_TITLE = "text-base font-semibold leading-snug text-zinc-100";
const TIMELINE_META = "mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.78rem] text-zinc-500";
const TIMELINE_MONO =
  "font-mono text-sm text-zinc-400 tracking-tight tabular-nums";

type CategoryVisual = {
  accentBorder: string;
  dotClass: string;
  spineTint: string;
};

/** Motorsport accents: amber maintenance, emerald / ice for completed mods. */
const CATEGORY_VISUALS: Record<TimelineEventCategory, CategoryVisual> = {
  oil_change: {
    accentBorder: "border-l-[#F59E0B]/55",
    dotClass:
      "bg-[#F59E0B] shadow-[0_0_14px_rgba(245,158,11,0.55)] ring-1 ring-[#F59E0B]/30",
    spineTint: "from-[#F59E0B]/25",
  },
  repair: {
    accentBorder: "border-l-[#F59E0B]/55",
    dotClass:
      "bg-[#F59E0B] shadow-[0_0_14px_rgba(245,158,11,0.55)] ring-1 ring-[#F59E0B]/30",
    spineTint: "from-[#F59E0B]/25",
  },
  inspection: {
    accentBorder: "border-l-[#F59E0B]/45",
    dotClass:
      "bg-[#F59E0B]/90 shadow-[0_0_12px_rgba(245,158,11,0.4)] ring-1 ring-[#F59E0B]/25",
    spineTint: "from-[#F59E0B]/20",
  },
  part_install: {
    accentBorder: "border-l-emerald-400/55",
    dotClass:
      "bg-emerald-400/95 shadow-[0_0_14px_rgba(52,211,153,0.5)] ring-1 ring-emerald-400/35",
    spineTint: "from-emerald-400/20",
  },
  tuev: {
    accentBorder: "border-l-sky-400/50",
    dotClass:
      "bg-sky-400/90 shadow-[0_0_12px_rgba(56,189,248,0.45)] ring-1 ring-sky-400/30",
    spineTint: "from-sky-400/18",
  },
  other: {
    accentBorder: "border-l-zinc-500/50",
    dotClass:
      "bg-zinc-400 shadow-[0_0_10px_rgba(161,161,170,0.35)] ring-1 ring-zinc-400/25",
    spineTint: "from-zinc-500/15",
  },
};

export type VehicleTimelineProps = {
  events: TimelineEvent[];
  documentHref?: (documentId: string) => string;
  emptyMessage?: string;
  className?: string;
};

function partitionTimelineEvents(events: TimelineEvent[]): {
  withMileage: TimelineEvent[];
  withoutMileage: TimelineEvent[];
} {
  const withMileage: TimelineEvent[] = [];
  const withoutMileage: TimelineEvent[] = [];

  for (const event of events) {
    if (event.mileageKnown === false) {
      withoutMileage.push(event);
    } else {
      withMileage.push(event);
    }
  }

  return { withMileage, withoutMileage };
}

export function VehicleTimeline({
  events,
  documentHref,
  emptyMessage = "Noch keine Einträge — Beleg scannen oder manuell hinzufügen.",
  className = "",
}: VehicleTimelineProps) {
  if (events.length === 0) {
    return (
      <div
        className={cn(
          TIMELINE_CARD_SHELL,
          "px-5 py-10 text-center text-[0.88rem] leading-relaxed text-zinc-400",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  const { withMileage, withoutMileage } = partitionTimelineEvents(events);

  return (
    <div className={cn("space-y-8", className)}>
      {withMileage.length > 0 ? (
        <TimelineEventList
          events={withMileage}
          documentHref={documentHref}
          ariaLabel="Historie nach Kilometerstand"
          showMileage
        />
      ) : null}

      {withoutMileage.length > 0 ? (
        <section className="space-y-3">
          <p className="px-1 text-[0.72rem] font-medium uppercase tracking-[0.12em] text-zinc-500">
            Ohne Kilometerstand
          </p>
          <TimelineEventList
            events={withoutMileage}
            documentHref={documentHref}
            ariaLabel="Einträge ohne Kilometerstand"
            showMileage={false}
          />
        </section>
      ) : null}
    </div>
  );
}

function TimelineEventList({
  events,
  documentHref,
  ariaLabel,
  showMileage,
}: {
  events: TimelineEvent[];
  documentHref?: (documentId: string) => string;
  ariaLabel: string;
  showMileage: boolean;
}) {
  const spineFrom = CATEGORY_VISUALS[events[0]?.category ?? "other"].spineTint;

  return (
    <ol aria-label={ariaLabel} className="relative space-y-0">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-3 left-[11px] top-3 w-px bg-gradient-to-b via-zinc-700/40 to-transparent",
          spineFrom,
        )}
      />
      {events.map((event, index) => (
        <TimelineEventRow
          key={event.id}
          event={event}
          documentHref={documentHref}
          showMileage={showMileage}
          isLast={index === events.length - 1}
        />
      ))}
    </ol>
  );
}

function TimelineMetaSeparator() {
  return (
    <span aria-hidden className="text-zinc-600 select-none">
      ·
    </span>
  );
}

function TimelineEventRow({
  event,
  documentHref,
  showMileage,
  isLast,
}: {
  event: TimelineEvent;
  documentHref?: (documentId: string) => string;
  showMileage: boolean;
  isLast: boolean;
}) {
  const visual = CATEGORY_VISUALS[event.category];
  const costLabel = formatTimelineCost(event.cost);
  const dateLabel = formatTimelineDate(event.date);
  const mileageLabel = showMileage
    ? formatTimelineMileage(event.mileage, { known: event.mileageKnown })
    : null;
  const href =
    event.documentId && documentHref
      ? documentHref(event.documentId)
      : null;

  const card = (
    <article
      className={cn(
        TIMELINE_CARD_SHELL,
        "border-l-[3px]",
        visual.accentBorder,
        href && "group-hover:border-white/[0.12] group-hover:shadow-[0_16px_48px_rgba(0,0,0,0.4)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className={TIMELINE_TITLE}>{event.title}</h3>
          <p className={TIMELINE_META}>
            <span>{TIMELINE_CATEGORY_LABELS[event.category]}</span>
            {mileageLabel ? (
              <>
                <TimelineMetaSeparator />
                <span className={TIMELINE_MONO}>{mileageLabel}</span>
              </>
            ) : null}
            {dateLabel ? (
              <>
                <TimelineMetaSeparator />
                <span className={TIMELINE_MONO}>{dateLabel}</span>
              </>
            ) : null}
            {costLabel ? (
              <>
                <TimelineMetaSeparator />
                <span className={TIMELINE_MONO}>{costLabel}</span>
              </>
            ) : null}
            {event.isManualEntry ? (
              <>
                <TimelineMetaSeparator />
                <span>Manuell</span>
              </>
            ) : null}
          </p>
        </div>
        {href ? (
          <ChevronRight
            className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-300 group-active:translate-x-0.5"
            aria-hidden
          />
        ) : null}
      </div>

      {event.description ? (
        <p className="mt-2.5 line-clamp-3 text-[0.84rem] leading-relaxed text-zinc-500">
          {event.description}
        </p>
      ) : null}
    </article>
  );

  return (
    <li
      className={cn(
        "relative grid min-w-0 grid-cols-[24px_minmax(0,1fr)] gap-x-3",
        !isLast && "pb-5",
      )}
    >
      <div className="relative flex justify-center pt-5">
        <span
          aria-hidden
          className="relative z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/10 bg-zinc-950/70 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        >
          <span className={cn("h-2 w-2 rounded-full", visual.dotClass)} />
        </span>
      </div>

      <div className="min-w-0 pt-3">
        {href ? (
          <PressableLink href={href} variant="row" nav="forward" className="group block min-w-0">
            <span className="sr-only">
              {event.isManualEntry ? "Eintrag öffnen" : "Dokument anzeigen"}
            </span>
            {card}
          </PressableLink>
        ) : (
          card
        )}
      </div>
    </li>
  );
}
