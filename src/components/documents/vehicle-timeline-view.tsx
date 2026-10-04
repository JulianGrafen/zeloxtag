"use client";

import { useMemo } from "react";
import { ArrowLeft, ScanLine } from "lucide-react";

import { VehicleTimeline } from "@/components/dashboard/VehicleTimeline";
import { FixedBottomActionBar } from "@/components/vehicle-dashboard/fixed-bottom-action-bar";
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

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-28 pt-[max(0.85rem,env(safe-area-inset-top))] sm:px-5">
        <header className="vd-anim-header space-y-2.5">
          <PressableLink
            href={resolvedBack}
            variant="pill"
            className="vd-back-pill"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Zurück
          </PressableLink>

          <div className="flex flex-wrap items-center gap-3 px-0.5">
            <h1 className="font-[family-name:var(--font-display)] text-[1.35rem] font-semibold leading-tight tracking-[-0.035em] text-zinc-100">
              Historie
            </h1>
            <span
              className="inline-flex max-w-full items-center rounded-full border border-white/[0.1] bg-zinc-900/50 px-2.5 py-1 text-[0.72rem] font-medium tracking-tight text-zinc-400 backdrop-blur-sm"
            >
              <span className="truncate">{vehicleLabel}</span>
            </span>
          </div>
          <p className="px-0.5 text-[0.78rem] leading-snug text-zinc-500">
            Nach Kilometerstand — Belege, Service, Umbauten
          </p>
        </header>

        <VehicleTimeline
          events={events}
          documentHref={resolveDocumentHref}
        />
      </div>

      {scanHref ? (
        <FixedBottomActionBar
          portal
          innerClassName="border-t border-white/[0.06] bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent pt-4 shadow-[0_-16px_48px_rgba(0,0,0,0.45)]"
        >
          <PressableLink
            href={scanHref}
            variant="button"
            className="flex w-full min-h-[52px] items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white text-[0.95rem] font-semibold text-zinc-950 shadow-[0_0_25px_rgba(255,255,255,0.12)] transition-all hover:bg-zinc-200 active:scale-[0.99] no-underline"
          >
            <ScanLine className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2} />
            Scannen
          </PressableLink>
        </FixedBottomActionBar>
      ) : null}
    </div>
  );
}
