import { DOCUMENT_MAX_PAGES } from "./constants";

export function resolveDocumentPageCount(
  pageCount: number | null | undefined,
  hasStoredFile: boolean,
): number {
  if (!hasStoredFile) return 0;
  if (pageCount != null && pageCount > 0) return pageCount;
  return 1;
}

export function documentAppendPhotoLimit(currentPageCount: number): number {
  if (currentPageCount <= 0) {
    return DOCUMENT_MAX_PAGES;
  }
  return Math.max(0, DOCUMENT_MAX_PAGES - currentPageCount);
}
