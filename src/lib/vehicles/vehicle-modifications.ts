import {
  filterManualVehicleEntries,
  isManualVehicleEntry,
  isTuningLikeCategory,
} from "@/lib/documents/manual-entries";
import { parseLineItems } from "@/lib/documents/line-items";
import { isVatLineItem } from "@/lib/ocr/invoice-vat";
import type { Document } from "@/types/database";

export type VehicleModificationSource = "abe" | "invoice" | "manual";

export type VehicleModification = {
  id: string;
  category: string;
  partName: string;
  manufacturer: string | null;
  kbaNumber: string | null;
  approvalStatus: string;
  /** ISO date string for sorting (YYYY-MM-DD or created_at prefix). */
  date: string | null;
  amount: number | null;
  source: VehicleModificationSource;
};

export type ExtractVehicleModificationsOptions = {
  hideFinancials: boolean;
  /** Restrict to a document subset (e.g. public showcase). Default: all documents. */
  documentFilter?: (doc: Document) => boolean;
  /**
   * Public showcase: owner already opted these invoices in.
   * Include them even when OCR category is not exactly `tuning`.
   */
  includeOptedInInvoices?: boolean;
};

const LABOR_LABEL =
  /^(?:arbeitslohn|arbeitszeit|montage|demontage|kleinmaterial|entsorgung|material)$/i;

const SKIP_INVOICE_LINE =
  /^(?:summe|gesamt|netto|brutto|zwischensumme|position(?:en)?)$/i;

const GENERIC_INVOICE_TITLE = /^(?:rechnung|invoice)$/i;

function sortDocumentsByDate(documents: Document[]): Document[] {
  return [...documents].sort((a, b) =>
    (b.date ?? b.created_at).localeCompare(a.date ?? a.created_at),
  );
}

function documentDate(doc: Document): string | null {
  return doc.date ?? doc.created_at.slice(0, 10);
}

function shouldIncludeInvoiceLine(label: string): boolean {
  const trimmed = label.trim();
  if (trimmed.length < 2) return false;
  if (isVatLineItem({ label: trimmed, amount: 0 })) return false;
  if (LABOR_LABEL.test(trimmed)) return false;
  if (/^(?:arbeitslohn|arbeitszeit)\b/i.test(trimmed)) return false;
  if (SKIP_INVOICE_LINE.test(trimmed)) return false;
  return true;
}

function isAbeDocument(doc: Document): boolean {
  if (doc.type === "abe") return true;
  const category = doc.category?.trim().toLowerCase();
  return category === "abe";
}

function isTuningInvoice(
  doc: Document,
  includeOptedInInvoices = false,
): boolean {
  if (doc.type !== "invoice") return false;
  if (includeOptedInInvoices) return true;
  return isTuningLikeCategory(doc.category);
}

function resolveInvoicePartLabel(doc: Document): string {
  const title = doc.title?.trim() ?? "";
  const vendor = doc.vendor?.trim() ?? "";

  if (title.length >= 2 && !GENERIC_INVOICE_TITLE.test(title)) {
    return title;
  }
  if (vendor.length >= 2) return vendor;
  if (doc.invoice_number?.trim()) {
    return `Rechnung ${doc.invoice_number.trim()}`;
  }
  return "Tuning-Rechnung";
}

function extractFromAbeDocuments(
  documents: Document[],
  hideFinancials: boolean,
): VehicleModification[] {
  return sortDocumentsByDate(documents.filter(isAbeDocument)).map((doc) => ({
    id: doc.id,
    category: doc.part_category?.trim() || "ABE / Gutachten",
    partName: doc.title?.trim() || "ABE / Gutachten",
    manufacturer: doc.manufacturer?.trim() || null,
    kbaNumber: doc.kba_number?.trim() || null,
    approvalStatus: doc.authority?.trim() || "ABE vorhanden",
    date: documentDate(doc),
    amount: hideFinancials ? null : doc.amount,
    source: "abe" as const,
  }));
}

function extractFromTuningInvoices(
  documents: Document[],
  hideFinancials: boolean,
  includeOptedInInvoices = false,
): VehicleModification[] {
  const mods: VehicleModification[] = [];
  const seenLineKeys = new Set<string>();

  for (const doc of sortDocumentsByDate(
    documents.filter(
      (row) =>
        !isManualVehicleEntry(row) &&
        isTuningInvoice(row, includeOptedInInvoices),
    ),
  )) {
    const lineItems = parseLineItems(doc.line_items) ?? [];
    let addedFromLines = false;

    for (const item of lineItems) {
      if (!shouldIncludeInvoiceLine(item.label)) continue;
      const key = item.label.trim().toLowerCase();
      if (seenLineKeys.has(key)) continue;
      seenLineKeys.add(key);

      mods.push({
        id: `${doc.id}-${key.slice(0, 24)}`,
        category: doc.category?.trim() || "Tuning / Teile",
        partName: item.label.trim(),
        manufacturer: doc.vendor?.trim() || null,
        kbaNumber: null,
        approvalStatus: "Rechnung",
        date: documentDate(doc),
        amount: hideFinancials ? null : item.amount,
        source: "invoice",
      });
      addedFromLines = true;
    }

    if (!addedFromLines) {
      mods.push({
        id: doc.id,
        category: doc.category?.trim() || "Tuning / Teile",
        partName: resolveInvoicePartLabel(doc),
        manufacturer: doc.manufacturer?.trim() || doc.vendor?.trim() || null,
        kbaNumber: null,
        approvalStatus: "Rechnung",
        date: documentDate(doc),
        amount: hideFinancials ? null : doc.amount,
        source: "invoice",
      });
    }
  }

  return mods;
}

function extractFromManualEntries(
  documents: Document[],
  hideFinancials: boolean,
): VehicleModification[] {
  const mods: VehicleModification[] = [];

  for (const entry of filterManualVehicleEntries(documents)) {
    if (!isTuningLikeCategory(entry.category)) continue;

    mods.push({
      id: entry.id,
      category: "Manueller Eintrag",
      partName: entry.title?.trim() || "Tuning-Eintrag",
      manufacturer: entry.vendor?.trim() || null,
      kbaNumber: null,
      approvalStatus: "Eintrag",
      date: documentDate(entry),
      amount: hideFinancials ? null : entry.amount,
      source: "manual",
    });
  }

  return mods;
}

/** Collect ABE, tuning invoices (with line-item + document fallback), and manual tuning entries. */
export function extractVehicleModifications(
  documents: Document[],
  options: ExtractVehicleModificationsOptions,
): VehicleModification[] {
  const scoped = options.documentFilter
    ? documents.filter(options.documentFilter)
    : documents;

  const modifications = [
    ...extractFromAbeDocuments(scoped, options.hideFinancials),
    ...extractFromManualEntries(scoped, options.hideFinancials),
    ...extractFromTuningInvoices(
      scoped,
      options.hideFinancials,
      options.includeOptedInInvoices === true,
    ),
  ];

  return modifications.sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? ""),
  );
}

export function sumVehicleModificationAmounts(
  modifications: VehicleModification[],
): number | null {
  let total = 0;
  let hasAmount = false;
  for (const row of modifications) {
    if (row.amount == null || !Number.isFinite(row.amount)) continue;
    total += row.amount;
    hasAmount = true;
  }
  return hasAmount ? total : null;
}
