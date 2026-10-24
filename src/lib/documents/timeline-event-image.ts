import type { Document } from "@/types/database";

import {
  isManualVehicleEntry,
  isTuningLikeCategory,
} from "./manual-entries";
import {
  documentMediaKind,
  isViewableDocumentUrl,
  resolveDocumentViewUrl,
} from "./viewable-url";

/** Chronik thumbnails: Fotodoku on manual Umbauten only — not scanned invoices. */
export function documentEligibleForChronikPhotoPreview(
  document: Document | undefined | null,
): boolean {
  if (!document) return false;
  if (!isManualVehicleEntry(document)) return false;
  return isTuningLikeCategory(document.category);
}

/** First inline image for a timeline-linked document (manual photo, scan, etc.). */
export function resolveTimelineEventImageUrl(
  document: Document | undefined | null,
): string | null {
  if (!documentEligibleForChronikPhotoPreview(document)) return null;
  if (!document?.file_url) return null;
  if (!isViewableDocumentUrl(document.file_url)) return null;
  if (documentMediaKind(document.file_url) !== "image") return null;
  return resolveDocumentViewUrl(document.file_url);
}

/** Whether the chronik row should attempt a photo preview (image or PDF page 1). */
export function documentHasTimelinePreview(
  document: Document | undefined | null,
): boolean {
  if (!documentEligibleForChronikPhotoPreview(document)) return false;
  if (!document?.file_url) return false;
  if (document.file_url.startsWith("mock://")) return true;
  if (!isViewableDocumentUrl(document.file_url)) return false;
  const kind = documentMediaKind(document.file_url);
  return kind === "image" || kind === "pdf";
}
