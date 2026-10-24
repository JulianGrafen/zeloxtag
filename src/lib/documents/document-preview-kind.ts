import type { DocumentMediaKind } from "@/lib/documents/viewable-url";
import { documentMediaKind, isViewableDocumentUrl } from "@/lib/documents/viewable-url";

/** Infer media kind for inline preview (incl. mock session data URLs). */
export function resolveDocumentPreviewKind(
  fileUrl: string,
  mockSessionSrc: string | null,
): DocumentMediaKind | null {
  if (mockSessionSrc) {
    const lower = mockSessionSrc.toLowerCase();
    if (lower.startsWith("data:image/")) return "image";
    if (lower.startsWith("data:application/pdf")) return "pdf";
    return "unknown";
  }
  if (!isViewableDocumentUrl(fileUrl)) return null;
  return documentMediaKind(fileUrl);
}

export function isGalleryPreviewKind(
  kind: DocumentMediaKind | null,
): boolean {
  return kind === "image" || kind === "pdf";
}
