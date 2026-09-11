import { showcaseLineItemsFromDocument } from "@/lib/vehicles/public-showcase-line-items";
import type { Document } from "@/types/database";

export function formatShowcaseDocumentMeta(doc: Document): string | null {
  const parts: string[] = [];
  if (doc.vendor) parts.push(doc.vendor);
  if (doc.category) parts.push(doc.category);
  const positionCount = showcaseLineItemsFromDocument(doc).length;
  if (positionCount > 0) {
    parts.push(`${positionCount} Positionen`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
