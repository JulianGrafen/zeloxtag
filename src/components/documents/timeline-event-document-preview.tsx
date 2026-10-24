"use client";

import { TimelineEventHeroImage } from "@/components/documents/timeline-event-hero-image";
import { useTimelineDocumentThumbnail } from "@/components/documents/use-timeline-document-thumbnail";
import { documentHasTimelinePreview } from "@/lib/documents/timeline-event-image";
import type { Document } from "@/types/database";
import { cn } from "@/lib/utils";

type TimelineEventDocumentPreviewProps = {
  document: Document | undefined | null;
  className?: string;
};

export function TimelineEventDocumentPreview({
  document,
  className,
}: TimelineEventDocumentPreviewProps) {
  const { src, loading } = useTimelineDocumentThumbnail(document);

  if (!document || !documentHasTimelinePreview(document)) {
    return null;
  }

  if (loading) {
    return (
      <div
        className={cn(
          "mt-2 min-h-[6.5rem] w-full animate-pulse rounded-2xl bg-neutral-800/80",
          className,
        )}
        aria-hidden
      />
    );
  }

  if (!src) {
    return null;
  }

  return <TimelineEventHeroImage src={src} className={className} />;
}
