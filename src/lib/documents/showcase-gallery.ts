import type { Document } from "@/types/database";

/** Stable marker in `invoice_number` for showcase gallery photos. */
export const SHOWCASE_GALLERY_MARKER = "__showcase_gallery__";

export const SHOWCASE_GALLERY_CATEGORY = "showcase_gallery";

export const MAX_SHOWCASE_GALLERY_PHOTOS = 10;

export function isShowcaseGalleryDocument(doc: Document): boolean {
  return doc.invoice_number === SHOWCASE_GALLERY_MARKER;
}

/** Gallery sort index (1-based); stored in `documents.amount` for gallery rows only. */
export function showcaseGallerySortIndex(doc: Document): number | null {
  if (!isShowcaseGalleryDocument(doc)) return null;
  const amount = doc.amount;
  if (amount == null || !Number.isFinite(amount)) return null;
  const index = Math.trunc(amount);
  if (index < 1 || index > MAX_SHOWCASE_GALLERY_PHOTOS) return null;
  return index;
}

export function compareShowcaseGalleryDocuments(a: Document, b: Document): number {
  const aSort = showcaseGallerySortIndex(a);
  const bSort = showcaseGallerySortIndex(b);
  if (aSort != null && bSort != null && aSort !== bSort) {
    return aSort - bSort;
  }
  if (aSort != null && bSort == null) return -1;
  if (aSort == null && bSort != null) return 1;
  return a.created_at.localeCompare(b.created_at);
}

export function filterShowcaseGalleryDocuments(documents: Document[]): Document[] {
  return documents
    .filter(isShowcaseGalleryDocument)
    .sort(compareShowcaseGalleryDocuments);
}

export function nextShowcaseGallerySortIndex(documents: Document[]): number {
  const gallery = filterShowcaseGalleryDocuments(documents);
  let max = 0;
  for (const doc of gallery) {
    const index = showcaseGallerySortIndex(doc);
    if (index != null && index > max) max = index;
  }
  return max + 1;
}
