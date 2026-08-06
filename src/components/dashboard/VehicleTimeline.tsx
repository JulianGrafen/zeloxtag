"use client";

import type { ReactNode } from "react";
import {
  Droplet,
  FileText,
  Gauge,
  Package,
  ShieldCheck,
  Wrench,
} from "lucide-react";

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

type CategoryVisual = {
  icon: ReactNode;
  badgeClass: string;
  nodeClass: string;
};

const CATEGORY_VISUALS: Record<TimelineEventCategory, CategoryVisual> = {
  oil_change: {
    icon: <Droplet className="h-3.5 w-3.5" aria-hidden />,
    badgeClass: "bg-amber-500/15 text-amber-900",
    nodeClass: "border-amber-400 bg-amber-50 text-amber-900",
  },
  repair: {
    icon: <Wrench className="h-3.5 w-3.5" aria-hidden />,
    badgeClass: "bg-rose-500/12 text-rose-900",
    nodeClass: "border-rose-400 bg-rose-50 text-rose-900",
  },
  inspection: {
    icon: <Gauge className="h-3.5 w-3.5" aria-hidden />,
    badgeClass: "bg-sky-500/12 text-sky-900",
    nodeClass: "border-sky-400 bg-sky-50 text-sky-900",
  },
  part_install: {
    icon: <Package className="h-3.5 w-3.5" aria-hidden />,
    badgeClass: "bg-emerald-500/12 text-emerald-900",
    nodeClass: "border-emerald-400 bg-emerald-50 text-emerald-900",
  },
  tuev: {
    icon: <ShieldCheck className="h-3.5 w-3.5" aria-hidden />,
    badgeClass: "bg-blue-500/12 text-blue-900",
    nodeClass: "border-blue-400 bg-blue-50 text-blue-900",
  },
  other: {
    icon: <FileText className="h-3.5 w-3.5" aria-hidden />,
    badgeClass: "bg-neutral-900/8 text-neutral-800",
    nodeClass: "border-neutral-400 bg-neutral-50 text-neutral-800",
  },
};

export type VehicleTimelineProps = {
  events: TimelineEvent[];
  /** Build document detail href from documentId (e.g. `/v/{uuid}/dokumente/{id}`). */
  documentHref?: (documentId: string) => string;
  emptyMessage?: string;
  className?: string;
};

/**
 * Vertical mileage-ordered Service & History Timeline (mobile-first).
 */
export function VehicleTimeline({
  events,
  documentHref,
  emptyMessage = "Noch keine Meilensteine mit Kilometerstand — Belege scannen oder eintragen.",
  className = "",
}: VehicleTimelineProps) {
  if (events.length === 0) {
    return (
      <div
        className={[
          "rounded-[1.35rem] border border-dashed border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-8 text-center text-[0.88rem] text-[color:var(--vd-muted)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <ol
      aria-label="Service-Historie nach Kilometerstand"
      className={[
        "relative ml-3 border-l-2 border-[color:var(--vd-border)] pl-5 sm:ml-4 sm:pl-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {events.map((event) => {
        const visual = CATEGORY_VISUALS[event.category];
        const costLabel = formatTimelineCost(event.cost);
        const href =
          event.documentId && documentHref
            ? documentHref(event.documentId)
            : null;

        return (
          <li key={event.id} className="relative pb-6 last:pb-0">
            <span
              className={[
                "absolute -left-[1.55rem] top-1 z-10 inline-flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border-2 shadow-sm sm:-left-[1.8rem]",
                visual.nodeClass,
              ].join(" ")}
            >
              {visual.icon}
            </span>

            <article className="min-w-0 rounded-[1.25rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-3.5 shadow-[var(--vd-shadow-sm)] sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-display)] text-[1.05rem] font-semibold tracking-[-0.03em] tabular-nums text-[color:var(--vd-text)]">
                    {formatTimelineMileage(event.mileage)}
                  </p>
                  <h3 className="mt-0.5 text-[0.95rem] font-medium leading-snug tracking-[-0.02em] text-[color:var(--vd-text)]">
                    {event.title}
                  </h3>
                </div>
                <span
                  className={[
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.68rem] font-medium",
                    visual.badgeClass,
                  ].join(" ")}
                >
                  {visual.icon}
                  {TIMELINE_CATEGORY_LABELS[event.category]}
                </span>
              </div>

              <p className="mt-2 text-[0.78rem] text-[color:var(--vd-muted)]">
                {formatTimelineDate(event.date)}
                {costLabel ? (
                  <span className="text-[color:var(--vd-muted)]">
                    {" "}
                    · <span className="tabular-nums">{costLabel}</span>
                  </span>
                ) : null}
              </p>

              {event.description ? (
                <p className="mt-2 text-[0.84rem] leading-relaxed text-[color:var(--vd-muted)]">
                  {event.description}
                </p>
              ) : null}

              {href ? (
                <PressableLink
                  href={href}
                  variant="pill"
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5 text-[0.82rem] font-medium text-[color:var(--vd-text)] sm:w-auto"
                >
                  <FileText className="h-4 w-4 shrink-0" aria-hidden />
                  Dokument anzeigen
                </PressableLink>
              ) : null}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
