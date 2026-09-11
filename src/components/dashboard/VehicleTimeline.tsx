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

type CategoryVisual = {
  accentBorder: string;
  dotClass: string;
};

const CATEGORY_VISUALS: Record<TimelineEventCategory, CategoryVisual> = {
  oil_change: {
    accentBorder: "border-l-amber-500/70",
    dotClass: "bg-amber-500",
  },
  repair: {
    accentBorder: "border-l-rose-500/70",
    dotClass: "bg-rose-500",
  },
  inspection: {
    accentBorder: "border-l-sky-500/70",
    dotClass: "bg-sky-500",
  },
  part_install: {
    accentBorder: "border-l-emerald-500/70",
    dotClass: "bg-emerald-500",
  },
  tuev: {
    accentBorder: "border-l-blue-500/70",
    dotClass: "bg-blue-500",
  },
  other: {
    accentBorder: "border-l-neutral-400/80",
    dotClass: "bg-neutral-500",
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
          "rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-5 py-10 text-center text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)] shadow-[var(--vd-shadow-sm)]",
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
          <p className="px-1 text-[0.78rem] font-medium text-[color:var(--vd-muted)]">
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
  return (
    <ol aria-label={ariaLabel} className="relative space-y-0">
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-3 left-[11px] top-3 w-px bg-gradient-to-b from-[color:var(--vd-border)] via-[color:var(--vd-border)] to-transparent"
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
  const href =
    event.documentId && documentHref
      ? documentHref(event.documentId)
      : null;
  const dateLine = [
    formatTimelineDate(event.date),
    costLabel ? costLabel : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const card = (
    <article
      className={cn(
        "min-w-0 rounded-2xl border border-[color:var(--vd-border)] border-l-[3px] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] transition-[box-shadow,transform] duration-200",
        visual.accentBorder,
        href && "group-hover:shadow-[var(--vd-shadow-hover)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {showMileage ? (
            <p className="font-[family-name:var(--font-display)] text-[1.12rem] font-semibold tracking-[-0.03em] tabular-nums text-[color:var(--vd-text)]">
              {formatTimelineMileage(event.mileage, {
                known: event.mileageKnown,
              })}
            </p>
          ) : null}
          <h3
            className={cn(
              "text-[0.94rem] font-medium leading-snug tracking-[-0.02em] text-[color:var(--vd-text)]",
              showMileage && "mt-1",
            )}
          >
            {event.title}
          </h3>
          <p className="mt-1.5 text-[0.78rem] text-[color:var(--vd-muted)]">
            <span>{TIMELINE_CATEGORY_LABELS[event.category]}</span>
            {dateLine ? (
              <>
                <span aria-hidden className="mx-1.5 text-[color:var(--vd-border)]">
                  ·
                </span>
                <span className="tabular-nums">{dateLine}</span>
              </>
            ) : null}
            {event.isManualEntry ? (
              <>
                <span aria-hidden className="mx-1.5 text-[color:var(--vd-border)]">
                  ·
                </span>
                <span>Manuell</span>
              </>
            ) : null}
          </p>
        </div>
        {href ? (
          <ChevronRight
            className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--vd-muted)] transition-transform duration-200 group-hover:translate-x-0.5 group-active:translate-x-0.5"
            aria-hidden
          />
        ) : null}
      </div>

      {event.description ? (
        <p className="mt-2.5 line-clamp-3 text-[0.84rem] leading-relaxed text-[color:var(--vd-muted)]">
          {event.description}
        </p>
      ) : null}
    </article>
  );

  return (
    <li className={cn("relative grid grid-cols-[24px_1fr] gap-x-3", !isLast && "pb-5")}>
      <div className="relative flex justify-center pt-5">
        <span
          aria-hidden
          className="relative z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]"
        >
          <span className={cn("h-2 w-2 rounded-full", visual.dotClass)} />
        </span>
      </div>

      <div className="min-w-0 pt-3">
        {href ? (
          <PressableLink href={href} variant="row" nav="forward" className="group block">
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
