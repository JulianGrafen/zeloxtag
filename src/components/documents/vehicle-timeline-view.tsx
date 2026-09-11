"use client";

import { useMemo } from "react";
import { ArrowLeft, Plus } from "lucide-react";

import { VehicleTimeline } from "@/components/dashboard/VehicleTimeline";
import {
  isManualVehicleEntry,
  manualEntryEditPath,
} from "@/lib/documents/manual-entries";
import {
  isEditableManualOilChangeDocument,
  manualOilChangeEditPath,
} from "@/lib/documents/manual-oil-change-form";
import {
  PressableLink,
} from "@/components/vehicle-dashboard/Pressable";
import type { TimelineEvent } from "@/lib/validations/timelineSchema";
import type { Document } from "@/types/database";

export type VehicleTimelineViewProps = {
  tagUuid: string;
  vehicleLabel: string;
  events: TimelineEvent[];
  documents?: Document[];
  /** Optional CTA to open scan / upload. */
  scanHref?: string;
  backHref?: string;
};

/**
 * Full-page shell for the mileage-ordered Service & History Timeline.
 */
export function VehicleTimelineView({
  tagUuid,
  vehicleLabel,
  events,
  documents = [],
  scanHref,
  backHref,
}: VehicleTimelineViewProps) {
  const resolvedBack = backHref ?? `/v/${tagUuid}`;
  const documentsById = useMemo(
    () => new Map(documents.map((doc) => [doc.id, doc])),
    [documents],
  );

  function resolveDocumentHref(documentId: string): string {
    const document = documentsById.get(documentId);
    if (document && isEditableManualOilChangeDocument(document)) {
      return manualOilChangeEditPath(tagUuid, documentId);
    }
    if (document && isManualVehicleEntry(document)) {
      return manualEntryEditPath(tagUuid, documentId, document.category);
    }
    return `/v/${tagUuid}/dokumente/${documentId}`;
  }

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <header className="vd-anim-header space-y-4">
          <div className="flex items-center justify-between gap-2">
            <PressableLink
              href={resolvedBack}
              variant="pill"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Zurück
            </PressableLink>
            {scanHref ? (
              <PressableLink
                href={scanHref}
                variant="pill"
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-2 text-[0.78rem] font-medium text-white"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Scannen
              </PressableLink>
            ) : null}
          </div>

          <header className="space-y-1 px-0.5">
            <h1 className="font-[family-name:var(--font-display)] text-[1.55rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)]">
              Historie
            </h1>
            <p className="text-[0.9rem] text-[color:var(--vd-muted)]">
              {vehicleLabel}
            </p>
          </header>
        </header>

        <VehicleTimeline
          events={events}
          documentHref={resolveDocumentHref}
        />
      </div>
    </div>
  );
}
