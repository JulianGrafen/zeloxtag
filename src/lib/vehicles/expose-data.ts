import { isOilChangeDocument, latestOilChangeIsoDate } from "@/lib/documents/oil-changes";
import { parseLineItems } from "@/lib/documents/line-items";
import {
  TIMELINE_CATEGORY_LABELS,
  type TimelineEvent,
  type TimelineEventCategory,
} from "@/lib/validations/timelineSchema";
import type { Document, Vehicle } from "@/types/database";

export type ExposeKind =
  | "service"
  | "modification"
  | "repair"
  | "tuev"
  | "other";

export interface ExposeInvestmentItem {
  id: string;
  partName: string;
  date: string | null;
  workshop: string | null;
  amount: number | null;
}

export interface ExposeTimelineEntry {
  id: string;
  date: string;
  kind: ExposeKind;
  kindLabel: string;
  title: string;
  parts: string | null;
  workshop: string | null;
}

export interface ExposeData {
  vehicleTitle: string;
  make: string;
  model: string;
  firstRegistrationYear: number | null;
  mileageKm: number | null;
  heroImageSrc: string | null;
  documentCount: number;
  investmentTotal: number | null;
  serviceCount: number;
  lastOilChangeDate: string | null;
  lastTuevDate: string | null;
  lastTuevStatus: string | null;
  investmentItems: ExposeInvestmentItem[];
  timeline: ExposeTimelineEntry[];
  generatedAt: string;
}

const EXPOSE_KIND_LABELS: Record<ExposeKind, string> = {
  service: "Service",
  modification: "Modifikation",
  repair: "Reparatur",
  tuev: "TÜV / HU",
  other: "Sonstiges",
};

const IBAN_RE = /\b[A-Z]{2}\d{2}[\sA-Z0-9]{10,34}\b/i;
const ACCOUNT_HINT_RE =
  /\b(?:iban|bic|swift|konto(?:nr|nummer)?|blz|bankverbindung)\b/i;
const ADDRESS_RE =
  /\b(?:straße|strasse|str\.|weg\b|platz\b|allee\b|\d{5}\s+[A-Za-zÄÖÜäöüß])/i;

const GENERIC_INVOICE_TITLE = /^(?:rechnung|invoice|beleg)$/i;

function latestMileageKm(documents: Document[]): number | null {
  let best: number | null = null;
  for (const doc of documents) {
    const km = doc.mileage_km;
    if (km == null || !Number.isFinite(km)) continue;
    if (best == null || km > best) best = km;
  }
  return best;
}

function documentDate(doc: Document): string | null {
  const fromDoc = doc.date?.trim();
  if (fromDoc && /^\d{4}-\d{2}-\d{2}$/.test(fromDoc)) return fromDoc;
  const created = doc.created_at?.slice(0, 10);
  if (created && /^\d{4}-\d{2}-\d{2}$/.test(created)) return created;
  return null;
}

/** Strip IBAN / account / address text. Private notes never enter this path. */
export function sanitizeExposeLabel(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (IBAN_RE.test(trimmed) || ACCOUNT_HINT_RE.test(trimmed)) return null;
  if (ADDRESS_RE.test(trimmed)) return null;
  return trimmed.slice(0, 120);
}

function isConfirmedInvoice(doc: Document): boolean {
  if (doc.type !== "invoice") return false;
  if (doc.amount != null && Number.isFinite(doc.amount) && doc.amount > 0) {
    return true;
  }
  const lines = parseLineItems(doc.line_items) ?? [];
  return lines.some((item) => Number.isFinite(item.amount) && item.amount > 0);
}

function invoiceAmount(doc: Document): number | null {
  if (doc.amount != null && Number.isFinite(doc.amount) && doc.amount > 0) {
    return doc.amount;
  }
  const lines = parseLineItems(doc.line_items) ?? [];
  let total = 0;
  let hasAmount = false;
  for (const item of lines) {
    if (!Number.isFinite(item.amount) || item.amount <= 0) continue;
    total += item.amount;
    hasAmount = true;
  }
  return hasAmount ? Math.round(total * 100) / 100 : null;
}

function invoicePartName(doc: Document): string {
  const title = sanitizeExposeLabel(doc.title);
  if (title && !GENERIC_INVOICE_TITLE.test(title)) return title;

  const lines = parseLineItems(doc.line_items) ?? [];
  for (const item of lines) {
    const label = sanitizeExposeLabel(item.label);
    if (label) return label;
  }

  const brand = sanitizeExposeLabel(doc.manufacturer ?? doc.vendor);
  if (brand) return brand;
  return "Rechnung";
}

function invoiceWorkshop(doc: Document): string | null {
  return (
    sanitizeExposeLabel(doc.vendor) ?? sanitizeExposeLabel(doc.manufacturer)
  );
}

function buildInvestmentItems(documents: Document[]): ExposeInvestmentItem[] {
  const items: ExposeInvestmentItem[] = [];

  for (const doc of documents.filter(isConfirmedInvoice)) {
    const lines = parseLineItems(doc.line_items) ?? [];
    const usableLines = lines.filter((item) => {
      const label = sanitizeExposeLabel(item.label);
      return Boolean(label) && Number.isFinite(item.amount) && item.amount > 0;
    });

    if (usableLines.length > 0) {
      for (const [index, item] of usableLines.entries()) {
        items.push({
          id: `${doc.id}-${index}`,
          partName: sanitizeExposeLabel(item.label) ?? "Position",
          date: documentDate(doc),
          workshop: invoiceWorkshop(doc),
          amount: item.amount,
        });
      }
      continue;
    }

    items.push({
      id: doc.id,
      partName: invoicePartName(doc),
      date: documentDate(doc),
      workshop: invoiceWorkshop(doc),
      amount: invoiceAmount(doc),
    });
  }

  return items.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

function sumInvestmentTotal(items: ExposeInvestmentItem[]): number | null {
  let total = 0;
  let hasAmount = false;
  for (const item of items) {
    if (item.amount == null || !Number.isFinite(item.amount)) continue;
    total += item.amount;
    hasAmount = true;
  }
  return hasAmount ? Math.round(total * 100) / 100 : null;
}

function exposeKindFromCategory(category: TimelineEventCategory): ExposeKind {
  switch (category) {
    case "oil_change":
    case "inspection":
      return "service";
    case "part_install":
      return "modification";
    case "repair":
      return "repair";
    case "tuev":
      return "tuev";
    default:
      return "other";
  }
}

function isServiceDocument(doc: Document): boolean {
  if (isOilChangeDocument(doc)) return true;
  const category = doc.category?.trim().toLowerCase();
  return category === "service" || category === "inspection";
}

function partsFromDocument(doc: Document | undefined): string | null {
  if (!doc) return null;
  const lines = parseLineItems(doc.line_items) ?? [];
  const labels = lines
    .map((item) => sanitizeExposeLabel(item.label))
    .filter((label): label is string => Boolean(label));
  if (labels.length > 0) return labels.slice(0, 4).join(" · ");

  const title = sanitizeExposeLabel(doc.title);
  if (title && !GENERIC_INVOICE_TITLE.test(title)) return title;
  return sanitizeExposeLabel(doc.part_category);
}

const TUEV_RESULT_LABELS: Record<string, string> = {
  no_defects: "Ohne Mängel",
  minor_defects: "Geringfügige Mängel",
  major_defects: "Erhebliche Mängel",
  dangerous_defects: "Gefährliche Mängel",
  failed: "Nicht bestanden",
};

function tuevStatusFromDocument(document: Document): string | null {
  const fields = document.approval_fields;
  if (fields?.kind === "tuev" && fields.data.result) {
    return TUEV_RESULT_LABELS[fields.data.result] ?? "HU durchgeführt";
  }
  return "HU durchgeführt";
}

function latestTuevDocument(documents: Document[]): Document | null {
  const tuevDocs = documents
    .filter((doc) => doc.type === "tuev" || doc.category === "tuev")
    .sort((a, b) => (b.date ?? b.created_at).localeCompare(a.date ?? a.created_at));
  return tuevDocs[0] ?? null;
}

function sortTimelineByDateDesc(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => {
    const cmp = b.date.localeCompare(a.date);
    if (cmp !== 0) return cmp;
    return b.id.localeCompare(a.id);
  });
}

function buildTimeline(
  timeline: TimelineEvent[],
  documents: Document[],
): ExposeTimelineEntry[] {
  const docById = new Map(documents.map((doc) => [doc.id, doc]));

  return sortTimelineByDateDesc(timeline).map((event) => {
    const linked = event.documentId ? docById.get(event.documentId) : undefined;
    const kind = exposeKindFromCategory(event.category);
    const title =
      sanitizeExposeLabel(event.title) ?? TIMELINE_CATEGORY_LABELS[event.category];

    return {
      id: event.id,
      date: event.date,
      kind,
      kindLabel: EXPOSE_KIND_LABELS[kind],
      title,
      parts: partsFromDocument(linked),
      workshop: linked ? invoiceWorkshop(linked) : null,
    };
  });
}

function countServices(
  documents: Document[],
  timeline: TimelineEvent[],
): number {
  const counted = new Set<string>();

  for (const doc of documents) {
    if (isServiceDocument(doc)) counted.add(`doc:${doc.id}`);
  }

  for (const event of timeline) {
    if (event.category !== "oil_change" && event.category !== "inspection") {
      continue;
    }
    if (event.documentId) {
      counted.add(`doc:${event.documentId}`);
      continue;
    }
    counted.add(`event:${event.id}`);
  }

  return counted.size;
}

/**
 * Build the public sales exposé payload.
 * Never includes VIN, owner id, notes, IBAN, addresses, or invoice files.
 */
export function buildExposeData(
  vehicle: Vehicle,
  documents: Document[],
  timeline: TimelineEvent[],
): ExposeData {
  const make = vehicle.make.trim();
  const model = vehicle.model.trim();
  const investmentItems = buildInvestmentItems(documents);
  const latestTuev = latestTuevDocument(documents);

  return {
    vehicleTitle: `${make} ${model}`.trim(),
    make,
    model,
    firstRegistrationYear: vehicle.year,
    mileageKm: latestMileageKm(documents),
    heroImageSrc: `/api/vehicle/silhouette/${vehicle.id}`,
    documentCount: documents.length,
    investmentTotal: sumInvestmentTotal(investmentItems),
    serviceCount: countServices(documents, timeline),
    lastOilChangeDate: latestOilChangeIsoDate(documents),
    lastTuevDate: latestTuev ? documentDate(latestTuev) : null,
    lastTuevStatus: latestTuev ? tuevStatusFromDocument(latestTuev) : null,
    investmentItems,
    timeline: buildTimeline(timeline, documents),
    generatedAt: new Date().toISOString(),
  };
}
