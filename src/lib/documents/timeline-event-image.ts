import type { Document } from "@/types/database";

import {
  documentMediaKind,
  isViewableDocumentUrl,
  resolveDocumentViewUrl,
} from "./viewable-url";

/** First inline image for a timeline-linked document (manual photo, scan, etc.). */
export function resolveTimelineEventImageUrl(
  document: Document | undefined | null,
): string | null {
  if (!document?.file_url) return null;
  if (!isViewableDocumentUrl(document.file_url)) return null;
  if (documentMediaKind(document.file_url) !== "image") return null;
  return resolveDocumentViewUrl(document.file_url);
}
