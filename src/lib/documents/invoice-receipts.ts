import { isManualVehicleEntry } from "@/lib/documents/manual-entries";
import type { Document } from "@/types/database";

const NON_RECEIPT_APPROVAL_KINDS = new Set([
  "abe",
  "teilegutachten",
  "einzelabnahme",
  "egbe",
  "tuev",
]);

/**
 * True for scanned/uploaded invoice receipts (Rechnungen & Belege).
 * Excludes manual timeline entries and misclassified approval documents.
 */
export function isInvoiceReceiptDocument(document: Document): boolean {
  if (document.type !== "invoice") return false;
  if (isManualVehicleEntry(document)) return false;

  const approvalKind = document.approval_fields?.kind;
  if (approvalKind && NON_RECEIPT_APPROVAL_KINDS.has(approvalKind)) {
    return false;
  }

  if (document.category?.trim().toLowerCase() === "tuev") {
    return false;
  }

  return true;
}

export function filterInvoiceReceiptDocuments(documents: Document[]): Document[] {
  return documents.filter(isInvoiceReceiptDocument);
}
