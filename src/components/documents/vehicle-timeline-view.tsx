"use client";

import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";

import { VehicleTimeline } from "@/components/dashboard/VehicleTimeline";
import { DashboardScanFab } from "@/components/tags/dashboard-scan-fab";
import { isOilChangeDocument } from "@/lib/documents/oil-changes";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
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
    if (document && isOilChangeDocument(document)) {
      return `/v/${tagUuid}/intervalle/${documentId}`;
    }
    return `/v/${tagUuid}/dokumente/${documentId}`;
  }

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <header className="vd-anim-header space-y-4">
          <PressableLink
            href={resolvedBack}
            variant="pill"
            className="vd-back-pill"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Zurück
          </PressableLink>

          <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
            <h1 className="font-[family-name:var(--font-display)] text-[1.55rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)]">
              Historie
            </h1>
            <p className="mt-2 text-[0.9rem] text-[color:var(--vd-muted)]">
              {vehicleLabel}
            </p>
          </div>
        </header>

        <VehicleTimeline
          events={events}
          documentHref={resolveDocumentHref}
        />
      </div>

      {scanHref ? (
        <DashboardScanFab
          tagUuid={tagUuid}
          scanHref={scanHref}
          scanLabel="Scannen"
        />
      ) : null}
    </div>
  );
}
