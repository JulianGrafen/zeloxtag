import type { Document } from "@/types/database";

const NON_RECEIPT_APPROVAL_KINDS = new Set([
  "abe",
  "teilegutachten",
  "einzelabnahme",
  "egbe",
  "tuev",
]);

/**
 * True for Belege list & summe: scanned receipts and manual entries with amount.
 * Excludes misclassified approval documents and TÜV-category rows.
 */
export function isInvoiceReceiptDocument(document: Document): boolean {
  return isCostOverviewDocument(document);
}

export function filterInvoiceReceiptDocuments(documents: Document[]): Document[] {
  return documents.filter(isInvoiceReceiptDocument);
}

/**
 * Invoices that count toward Investition / Umbau / Wartung (includes manual entries).
 */
export function isCostOverviewDocument(document: Document): boolean {
  if (document.type !== "invoice") return false;

  const approvalKind = document.approval_fields?.kind;
  if (approvalKind && NON_RECEIPT_APPROVAL_KINDS.has(approvalKind)) {
    return false;
  }

  if (document.category?.trim().toLowerCase() === "tuev") {
    return false;
  }

  return true;
}

export function filterCostOverviewDocuments(documents: Document[]): Document[] {
  return documents.filter(isCostOverviewDocument);
}
