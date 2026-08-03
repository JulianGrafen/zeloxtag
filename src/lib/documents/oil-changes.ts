/**
 * Oil-change detection from invoice OCR + derivation of interval records.
 */

import type { OilChangeRecord } from "@/components/vehicle-dashboard/oilChangeRecords";
import type { Document, DocumentLineItem } from "@/types/database";

import { formatDocumentDate } from "./format";

/** Default service interval when the invoice does not state one. */
export const DEFAULT_OIL_INTERVAL_KM = 10_000;
export const DEFAULT_OIL_INTERVAL_MONTHS = 12;

// Avoid `\b` before umlauts — JS word boundaries are ASCII-only.
const OIL_CHANGE_EXPLICIT =
  /(?:^|[^A-Za-z0-9_])(?:ölwechsel|oelwechsel|oil\s*change|öl\s*&\s*filter|öl\s*\/\s*filter|oel\s*\/\s*filter|motorölwechsel|motoroelwechsel)(?:[^A-Za-z0-9_]|$)/i;

const OIL_PRODUCT =
  /(?:^|[^A-Za-z0-9_])(?:motoröl|motoroel|engine\s*oil|ölfilter|oelfilter|oil\s*filter)(?:[^A-Za-z0-9_]|$)|(?:^|[^A-Za-z0-9_])(?:5w-?\d{2}|0w-?\d{2}|10w-?\d{2}|15w-?\d{2})(?:[^A-Za-z0-9_]|$)/i;

const FILTER_HINT =
  /(?:^|[^A-Za-z0-9_])(?:ölfilter|oelfilter|oil\s*filter)(?:[^A-Za-z0-9_]|$)|(?:^|[^A-Za-z0-9_])filter\s*(?:gewechselt|erneuert|ersetzt|inkl)/i;

const OIL_SPEC =
  /\b((?:fully\s+synthetic\s+)?(?:mazda\s+original\s+oil(?:\s+\w+)?|idemitsu(?:\s+\w+)?|castrol(?:\s+\w+)?|mobil\s*1|shell\s+helix|liqu[iı]?\s*moly|motul|total(?:\s+\w+)?|elf(?:\s+\w+)?)\s*)?(?:sae\s*)?(\d{1,2}w-?\d{2})\b/i;

const LITERS =
  /\b(\d+(?:[.,]\d+)?)\s*(?:l|ltr|liter|litre)s?\b/i;

export type OilChangeDetection = {
  isOilChange: boolean;
  oilSpec: string | null;
  oilAmountLiters: number | null;
  filterChanged: boolean;
  /** Suggested list/detail title. */
  title: string;
  /** Short notes for document.notes. */
  notes: string;
};

function blobFromInvoice(input: {
  title?: string | null;
  summary?: string | null;
  vendor?: string | null;
  category?: string | null;
  notes?: string | null;
  lineItems?: DocumentLineItem[] | null;
  rawText?: string | null;
}): string {
  const lines = (input.lineItems ?? []).map((item) => item.label).join("\n");
  return [
    input.title,
    input.summary,
    input.vendor,
    input.category,
    input.notes,
    lines,
    input.rawText,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Detect whether an invoice describes an oil change / Ölwechsel.
 */
export function detectOilChangeInvoice(input: {
  title?: string | null;
  summary?: string | null;
  vendor?: string | null;
  category?: string | null;
  notes?: string | null;
  lineItems?: DocumentLineItem[] | null;
  rawText?: string | null;
}): OilChangeDetection {
  const text = blobFromInvoice(input);
  const explicit = OIL_CHANGE_EXPLICIT.test(text);
  const hasOilProduct = OIL_PRODUCT.test(text);
  const filterChanged = FILTER_HINT.test(text);

  // Detect oil work even as a side job on tuning/repair invoices.
  // Title/category promotion uses `isPrimaryOilChange` separately.
  const hasViscosity = /\b(?:5|0|10|15)w-?\d{2}\b/i.test(text);
  const isOilChange =
    explicit ||
    (hasOilProduct && (filterChanged || hasViscosity)) ||
    (hasOilProduct &&
      (input.category === "service" ||
        /(?:^|[^A-Za-z0-9_])(?:service|inspektion|wartung|arbeitslohn)(?:[^A-Za-z0-9_]|$)/i.test(
          text,
        )));

  const oilSpec = extractOilSpec(text);
  const oilAmountLiters = extractOilLiters(text);

  const titleParts = ["Ölwechsel"];
  if (oilSpec) titleParts.push(oilSpec);
  if (oilAmountLiters) {
    titleParts.push(`${oilAmountLiters.toLocaleString("de-DE")} l`);
  }

  const noteParts = ["Ölwechsel"];
  if (oilSpec) noteParts.push(oilSpec);
  if (oilAmountLiters) {
    noteParts.push(`${oilAmountLiters.toLocaleString("de-DE")} l`);
  }
  noteParts.push(filterChanged ? "Filter gewechselt" : "Filter unklar");

  return {
    isOilChange,
    oilSpec,
    oilAmountLiters,
    filterChanged,
    title: titleParts.join(" · ").slice(0, 160),
    notes: noteParts.join(" · ").slice(0, 500),
  };
}

export function extractOilSpec(text: string): string | null {
  const match = text.match(OIL_SPEC);
  if (!match) {
    const viscosity = text.match(/\b(\d{1,2}w-?\d{2})\b/i);
    return viscosity?.[1] ? viscosity[1].toUpperCase().replace(/w/i, "W-") : null;
  }

  const brand = (match[1] ?? "").replace(/\s+/g, " ").trim();
  const viscosity = (match[2] ?? "").toUpperCase().replace(/W(?!-)/, "W-");
  const combined = `${brand} ${viscosity}`.replace(/\s+/g, " ").trim();
  return combined.slice(0, 120) || null;
}

export function extractOilLiters(text: string): number | null {
  // Prefer amounts near oil wording.
  const nearOil = text.match(
    /(?:motoröl|motoroel|engine\s*oil|öl|oel)[^\n]{0,40}?(\d+(?:[.,]\d+)?)\s*(?:l|ltr|liter)/i,
  );
  const raw = nearOil?.[1] ?? text.match(LITERS)?.[1];
  if (!raw) return null;
  const value = Number.parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(value) || value <= 0 || value > 20) return null;
  return Math.round(value * 10) / 10;
}

/** True when a persisted document is an oil-change invoice. */
export function isOilChangeDocument(document: Document): boolean {
  return detectOilChangeInvoice({
    title: document.title,
    summary: document.title,
    vendor: document.vendor,
    category: document.category,
    notes: document.notes,
    lineItems: document.line_items,
  }).isOilChange;
}

export function filterOilChangeDocuments(documents: Document[]): Document[] {
  return documents
    .filter((doc) => doc.type === "invoice" || doc.category === "service")
    .filter(isOilChangeDocument)
    .sort((a, b) => {
      const aDate = a.date ?? a.created_at;
      const bDate = b.date ?? b.created_at;
      return bDate.localeCompare(aDate);
    });
}

function addMonthsIso(isoDate: string, months: number): string | null {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1 + months, day));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function toDisplayDate(isoDate: string | null): string {
  if (!isoDate) return "Ohne Datum";
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [year, month, day] = isoDate.split("-");
    return `${day}.${month}.${year}`;
  }
  return formatDocumentDate(isoDate);
}

/**
 * Map vehicle documents → Ölwechsel interval records (newest = aktuell).
 */
export function oilChangeRecordsFromDocuments(
  documents: Document[],
  options: {
    intervalKm?: number;
    intervalMonths?: number;
  } = {},
): OilChangeRecord[] {
  const intervalKm = options.intervalKm ?? DEFAULT_OIL_INTERVAL_KM;
  const intervalMonths = options.intervalMonths ?? DEFAULT_OIL_INTERVAL_MONTHS;
  const oilDocs = filterOilChangeDocuments(documents);

  return oilDocs.map((document, index) => {
    const detected = detectOilChangeInvoice({
      title: document.title,
      vendor: document.vendor,
      category: document.category,
      notes: document.notes,
      lineItems: document.line_items,
    });

    const isoDate = document.date ?? document.created_at.slice(0, 10);
    const mileageKm =
      typeof document.mileage_km === "number" ? document.mileage_km : 0;
    const nextDueIso = addMonthsIso(isoDate, intervalMonths) ?? isoDate;

    return {
      id: document.id,
      date: toDisplayDate(isoDate),
      mileageKm,
      workshop: document.vendor?.trim() || "Werkstatt",
      oilSpec: detected.oilSpec || "Motoröl",
      oilAmountLiters: detected.oilAmountLiters ?? 0,
      filterChanged: detected.filterChanged,
      intervalKm,
      intervalMonths,
      nextDueKm: mileageKm > 0 ? mileageKm + intervalKm : intervalKm,
      nextDueDate: toDisplayDate(nextDueIso),
      notes: document.notes?.trim() || detected.notes,
      invoiceRef: document.id,
      status: index === 0 ? "aktuell" : "erledigt",
    } satisfies OilChangeRecord;
  });
}

export function latestOilChangeIsoDate(documents: Document[]): string | null {
  const latest = filterOilChangeDocuments(documents)[0];
  if (!latest) return null;
  return latest.date ?? latest.created_at.slice(0, 10);
}
