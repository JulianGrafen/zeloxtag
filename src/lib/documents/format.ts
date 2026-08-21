import type { Document, DocumentType } from "@/types/database";

import { DOCUMENT_TYPE_LABELS } from "./constants";

/** TÜV next-HU month (YYYY-MM) → e.g. "Mai 2028". */
export function formatTuevYearMonth(ym: string | null): string {
  if (!ym?.trim()) return "—";
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [yearStr, monthStr] = ym.split("-");
  const year = Number.parseInt(yearStr!, 10);
  const month = Number.parseInt(monthStr!, 10);
  if (!year || month < 1 || month > 12) return ym;
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(
    "de-DE",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Format ISO date in Europe/Berlin (document date, not UTC-shifted). */
export function formatBerlinDocumentDate(isoDate: string | null): string {
  if (!isoDate) return "Ohne Datum";
  const iso = normalizeDocumentDateIso(isoDate);
  if (!iso) return isoDate.trim();
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
}

export function formatDocumentDate(isoDate: string | null): string {
  return formatBerlinDocumentDate(isoDate);
}

/** Local calendar date as YYYY-MM-DD (scan date, not UTC-shifted). */
export function localDateIso(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const GERMAN_MONTHS: Record<string, number> = {
  jan: 1,
  januar: 1,
  feb: 2,
  februar: 2,
  mar: 3,
  marz: 3,
  maer: 3,
  mär: 3,
  märz: 3,
  apr: 4,
  april: 4,
  mai: 5,
  jun: 6,
  juni: 6,
  jul: 7,
  juli: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  okt: 10,
  oct: 10,
  oktober: 10,
  nov: 11,
  november: 11,
  dez: 12,
  dec: 12,
  dezember: 12,
};

function foldGermanMonthToken(token: string): string {
  return token
    .replace(/\./g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .toLowerCase();
}

function resolveGermanMonth(token: string): number | null {
  const key = foldGermanMonthToken(token);
  return GERMAN_MONTHS[key] ?? null;
}

function expandYear(year: number): number {
  if (year >= 100) return year;
  return year >= 70 ? 1900 + year : 2000 + year;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return iso;
}

export type NormalizeDocumentDateOptions = {
  /** Used when OCR omits the year (e.g. „13.08“). Defaults to current calendar year. */
  defaultYear?: number;
};

/**
 * Normalize OCR / stored / pasted dates to ISO YYYY-MM-DD (German-first parsing).
 */
export function normalizeDocumentDateIso(
  raw: string | null | undefined,
  options: NormalizeDocumentDateOptions = {},
): string | null {
  if (!raw?.trim()) return null;
  const value = raw.trim();
  const fallbackYear = options.defaultYear ?? new Date().getFullYear();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const isoPrefix = value.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s]|$)/);
  if (isoPrefix?.[1]) return isoPrefix[1];

  const dottedFull = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dottedFull) {
    return toIsoDate(
      expandYear(Number(dottedFull[3])),
      Number(dottedFull[2]),
      Number(dottedFull[1]),
    );
  }

  const dottedShort = value.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (dottedShort) {
    return toIsoDate(
      fallbackYear,
      Number(dottedShort[2]),
      Number(dottedShort[1]),
    );
  }

  const dashed = value.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dashed) {
    return toIsoDate(
      expandYear(Number(dashed[3])),
      Number(dashed[2]),
      Number(dashed[1]),
    );
  }

  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const first = Number(slash[1]);
    const second = Number(slash[2]);
    const year = expandYear(Number(slash[3]));
    let day: number;
    let month: number;
    if (first > 12) {
      day = first;
      month = second;
    } else if (second > 12) {
      month = first;
      day = second;
    } else {
      day = first;
      month = second;
    }
    return toIsoDate(year, month, day);
  }

  const namedFull = value.match(
    /^(\d{1,2})\.?\s+([A-Za-zÄÖÜäöüß.]{3,12})\.?\s+(\d{2,4})$/,
  );
  if (namedFull) {
    const month = resolveGermanMonth(namedFull[2] ?? "");
    if (month) {
      return toIsoDate(
        expandYear(Number(namedFull[3])),
        month,
        Number(namedFull[1]),
      );
    }
  }

  const namedShort = value.match(
    /^(\d{1,2})\.?\s+([A-Za-zÄÖÜäöüß.]{3,12})\.?$/,
  );
  if (namedShort) {
    const month = resolveGermanMonth(namedShort[2] ?? "");
    if (month) {
      return toIsoDate(fallbackYear, month, Number(namedShort[1]));
    }
  }

  return null;
}

/** Parse user-entered or OCR date text into ISO. */
export function parseGermanDocumentDateInput(raw: string): string | null {
  return normalizeDocumentDateIso(raw.trim());
}

function isoForDisplay(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  return normalizeDocumentDateIso(raw) ?? null;
}

/** Compact German calendar date (22.08.2026) from ISO or OCR text. */
export function formatCompactGermanDate(isoOrRaw: string | null): string {
  const iso = isoForDisplay(isoOrRaw);
  if (!iso) return isoOrRaw?.trim() ?? "";
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

/** List/detail helper — numeric DE date or „Ohne Datum“. */
export function formatDocumentDateCompact(isoOrRaw: string | null): string {
  if (!isoOrRaw?.trim()) return "Ohne Datum";
  const compact = formatCompactGermanDate(isoOrRaw);
  return compact || isoOrRaw;
}

export function formatDocumentAmount(amount: number | null): string | null {
  if (amount === null || Number.isNaN(amount)) return null;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function documentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_LABELS[type];
}

/** Strip legacy OCR category prefixes like `[repair]` from stored titles. */
export function displayDocumentTitle(title: string): string {
  return title.replace(/^\[[a-z_]+\]\s*/i, "").trim() || title;
}

export function filterDocumentsByType(
  documents: Document[],
  type?: DocumentType | "all",
): Document[] {
  if (!type || type === "all") return documents;
  return documents.filter((doc) => doc.type === type);
}

export function sumInvoiceAmounts(documents: Document[]): number {
  return documents
    .filter((doc) => doc.type === "invoice" && doc.amount !== null)
    .reduce((sum, doc) => sum + (doc.amount ?? 0), 0);
}
