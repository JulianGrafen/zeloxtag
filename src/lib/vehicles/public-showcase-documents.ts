import {
  isManualEntryMarker,
  isManualVehicleEntry,
  isTuningLikeCategory,
  parseManualEntryCategory,
} from "@/lib/documents/manual-entries";
import { isShowcaseGalleryDocument } from "@/lib/documents/showcase-gallery";
import { hasStoredModificationImage } from "@/lib/vehicles/build-story-document";
import type { Document } from "@/types/database";

export function isPublicShowcaseDocument(doc: Document): boolean {
  return doc.show_on_public_showcase === true;
}

export function filterPublicShowcaseDocuments(documents: Document[]): Document[] {
  return documents.filter(isPublicShowcaseDocument);
}

/**
 * Umbau-Bilder are stored as `type: "invoice"` + `__manual__`.
 * Settings and the public showroom must treat them as modifications, not Rechnungen.
 */
export function isShowcaseModificationDocument(doc: Document): boolean {
  if (isShowcaseGalleryDocument(doc)) return false;

  if (isManualVehicleEntry(doc)) {
    const category = doc.category?.trim() ?? "";
    const parsed = parseManualEntryCategory(category || null);
    if (parsed === "service") {
      return hasStoredModificationImage(doc);
    }
    // Legacy / minimal rows: empty category counts as Umbau.
    return isTuningLikeCategory(doc.category) || category.length === 0;
  }

  if (doc.type !== "invoice" || isManualEntryMarker(doc.invoice_number)) {
    return false;
  }

  return isTuningLikeCategory(doc.category) && hasStoredModificationImage(doc);
}

/** Invoices + manual tuning entries the owner can opt into the public profile. */
export function listShowcaseSelectableDocuments(documents: Document[]): Document[] {
  const selectable: Document[] = [];

  for (const doc of documents) {
    if (isShowcaseGalleryDocument(doc)) continue;
    if (isShowcaseModificationDocument(doc) || doc.type === "invoice") {
      selectable.push(doc);
    }
  }

  return selectable.sort((a, b) =>
    (b.date ?? b.created_at).localeCompare(a.date ?? a.created_at),
  );
}

export function isShowcaseManualEntryDocument(doc: Document): boolean {
  return (
    isManualVehicleEntry(doc) &&
    !isShowcaseModificationDocument(doc) &&
    parseManualEntryCategory(doc.category) === "service"
  );
}

export function isShowcaseInvoiceDocument(doc: Document): boolean {
  if (isManualVehicleEntry(doc)) return false;
  return doc.type === "invoice";
}

export function partitionShowcaseSelectableDocuments(documents: Document[]): {
  invoices: Document[];
  modifications: Document[];
  manualEntries: Document[];
} {
  const invoices: Document[] = [];
  const modifications: Document[] = [];
  const manualEntries: Document[] = [];

  for (const doc of listShowcaseSelectableDocuments(documents)) {
    if (isShowcaseModificationDocument(doc)) {
      modifications.push(doc);
    } else if (isShowcaseManualEntryDocument(doc)) {
      manualEntries.push(doc);
    } else if (isShowcaseInvoiceDocument(doc)) {
      invoices.push(doc);
    }
  }

  return { invoices, modifications, manualEntries };
}

export function formatShowcaseDocumentLabel(doc: Document): string {
  if (isManualVehicleEntry(doc)) return doc.title;
  const parts = [doc.title || doc.vendor, doc.date?.slice(0, 10)].filter(Boolean);
  return parts.join(" · ") || "Rechnung";
}
