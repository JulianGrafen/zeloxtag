import {
  isManualVehicleEntry,
  isTuningLikeCategory,
  parseManualEntryCategory,
} from "@/lib/documents/manual-entries";
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
  if (!isManualVehicleEntry(doc)) return false;
  if (parseManualEntryCategory(doc.category) === "service") return false;
  // Legacy rows may lack category after minimal DB insert — treat as Umbau.
  return isTuningLikeCategory(doc.category) || doc.category == null;
}

/** Invoices + manual tuning entries the owner can opt into the public profile. */
export function listShowcaseSelectableDocuments(documents: Document[]): Document[] {
  const selectable: Document[] = [];

  for (const doc of documents) {
    if (isShowcaseModificationDocument(doc) || doc.type === "invoice") {
      selectable.push(doc);
    }
  }

  return selectable.sort((a, b) =>
    (b.date ?? b.created_at).localeCompare(a.date ?? a.created_at),
  );
}

export function partitionShowcaseSelectableDocuments(documents: Document[]): {
  invoices: Document[];
  modifications: Document[];
} {
  const invoices: Document[] = [];
  const modifications: Document[] = [];

  for (const doc of listShowcaseSelectableDocuments(documents)) {
    if (isShowcaseModificationDocument(doc)) {
      modifications.push(doc);
    } else {
      invoices.push(doc);
    }
  }

  return { invoices, modifications };
}

export function formatShowcaseDocumentLabel(doc: Document): string {
  if (isManualVehicleEntry(doc)) return doc.title;
  const parts = [doc.title || doc.vendor, doc.date?.slice(0, 10)].filter(Boolean);
  return parts.join(" · ") || "Rechnung";
}
