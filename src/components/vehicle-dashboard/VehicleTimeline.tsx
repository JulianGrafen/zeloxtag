"use client";

import Image from "next/image";
import { Camera, History, Stamp } from "lucide-react";
import { useMemo } from "react";

import { isAbeFamilyDocument } from "@/lib/documents/abe-family-documents";
import {
  formatTimelineChronikDate,
  formatTimelineCost,
  formatTimelineMileage,
} from "@/lib/documents/timeline-format";
import {
  documentMediaKind,
  isViewableDocumentUrl,
  resolveDocumentViewUrl,
} from "@/lib/documents/viewable-url";
import type { TimelineEvent } from "@/lib/validations/timelineSchema";
import type { Document } from "@/types/database";
import { PressableLink } from "./Pressable";
import { cn } from "@/lib/utils";

export type VehicleDashboardTimelineProps = {
  events: TimelineEvent[];
  documents: Document[];
  documentHref: (documentId: string) => string;
  emptyCtaHref: string;
  canAddEntry?: boolean;
  className?: string;
};

function resolveEventImageUrl(
  document: Document | undefined,
): string | null {
  if (!document?.file_url) return null;
  if (!isViewableDocumentUrl(document.file_url)) return null;
  if (documentMediaKind(document.file_url) !== "image") return null;
  return resolveDocumentViewUrl(document.file_url);
}

export function VehicleDashboardTimeline({
  events,
  documents,
  documentHref,
  emptyCtaHref,
  canAddEntry = true,
  className,
}: VehicleDashboardTimelineProps) {
  const documentsById = useMemo(
    () => new Map(documents.map((doc) => [doc.id, doc])),
    [documents],
  );

  if (events.length === 0) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-neutral-800 bg-neutral-900/80 px-5 py-10 text-center",
          className,
        )}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-800 bg-neutral-950">
          <History className="h-5 w-5 text-neutral-500" aria-hidden />
        </div>
        <p className="text-sm font-medium text-white">
          Noch keine Chronik-Einträge
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Belege, Umbauten und Service erscheinen hier automatisch.
        </p>
        {canAddEntry ? (
          <PressableLink
            href={emptyCtaHref}
            variant="button"
            className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-4 text-xs font-semibold text-white no-underline transition-colors hover:bg-neutral-700"
          >
            <Camera className="h-4 w-4 shrink-0" aria-hidden />
            + Ersten Umbau mit Foto festhalten
          </PressableLink>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative ml-4 space-y-6 border-l-2 border-neutral-800 pl-4",
        className,
      )}
      aria-label="Fahrzeug-Chronik"
    >
      {events.map((event) => {
        const linkedDoc = event.documentId
          ? documentsById.get(event.documentId)
          : undefined;
        const imageSrc = resolveEventImageUrl(linkedDoc);
        const costLabel = formatTimelineCost(event.cost);
        const dateLabel = formatTimelineChronikDate(event.date);
        const mileageLabel = formatTimelineMileage(event.mileage, {
          known: event.mileageKnown,
        });
        const docHref =
          event.documentId ? documentHref(event.documentId) : null;
        const showAbeBadge =
          linkedDoc != null && isAbeFamilyDocument(linkedDoc) && docHref;

        return (
          <article key={event.id} className="relative">
            <span
              aria-hidden
              className="absolute -left-[calc(1rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full border border-neutral-700 bg-neutral-400"
            />

            <header className="text-xs text-neutral-400">
              {dateLabel}
              {event.mileageKnown !== false ? (
                <>
                  <span aria-hidden className="px-1.5 text-neutral-600">
                    ·
                  </span>
                  {mileageLabel}
                </>
              ) : null}
            </header>

            <h3 className="mt-1 text-sm font-semibold text-white">
              {event.title}
            </h3>

            {imageSrc ? (
              <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-xl border border-neutral-800">
                <Image
                  src={imageSrc}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 512px) 100vw, 512px"
                  unoptimized
                />
              </div>
            ) : null}

            {(costLabel || showAbeBadge) ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {costLabel ? (
                  <span
                    className="inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900 px-2.5 py-0.5 text-[0.68rem] font-medium text-neutral-300"
                  >
                    {costLabel}
                  </span>
                ) : null}
                {showAbeBadge ? (
                  <PressableLink
                    href={docHref!}
                    variant="pill"
                    className="inline-flex items-center gap-1 rounded-full border border-neutral-800 bg-neutral-900 px-2.5 py-0.5 text-[0.68rem] font-medium text-neutral-300 no-underline hover:text-white"
                  >
                    <Stamp className="h-3 w-3 shrink-0" aria-hidden />
                    ABE hinterlegt
                  </PressableLink>
                ) : null}
              </div>
            ) : null}

            {event.description ? (
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-neutral-500">
                {event.description}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
