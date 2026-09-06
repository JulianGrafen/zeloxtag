import type { Document } from "@/types/database";

/** Stable marker in `invoice_number` for showcase gallery photos. */
export const SHOWCASE_GALLERY_MARKER = "__showcase_gallery__";

export const SHOWCASE_GALLERY_CATEGORY = "showcase_gallery";

export const MAX_SHOWCASE_GALLERY_PHOTOS = 10;

export function isShowcaseGalleryDocument(doc: Document): boolean {
  return doc.invoice_number === SHOWCASE_GALLERY_MARKER;
}

export function filterShowcaseGalleryDocuments(documents: Document[]): Document[] {
  return documents
    .filter(isShowcaseGalleryDocument)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}
