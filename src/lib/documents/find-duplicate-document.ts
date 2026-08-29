import { createHash } from "crypto";

import type { Document, DocumentType } from "@/types/database";

import { displayDocumentTitle, formatDocumentDateCompact } from "./format";
import { sanitizeVendorForStorage } from "./sanitize-vendor";

export function documentPageHash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 16);
}

function normalizeVendor(vendor: string | null): string {
  const { vendor: cleaned } = sanitizeVendorForStorage(vendor);
  return (cleaned ?? "").toLowerCase().replace(/\s+/g, " ");
}

function amountsMatch(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return false;
  return Math.abs(a - b) < 0.02;
}

function datesMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a.slice(0, 10) === b.slice(0, 10);
}

function vendorSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  if (longer.includes(shorter) && shorter.length >= 4) return 0.85;
  return 0;
}

export type DuplicateMatchInput = {
  vehicleId: string;
  type: DocumentType;
  title: string;
  vendor: string | null;
  date: string | null;
  amount: number | null;
  pageHash: string | null;
};

/**
 * Fuzzy-match against existing vehicle documents.
 * Exact PDF hash match always wins; fuzzy match requires date AND amount on both sides.
 * Missing date/amount must not count as a match — otherwise empty OCR blocks all saves.
 */
export function findDuplicateDocument(
  existing: Document[],
  candidate: DuplicateMatchInput,
): Document | null {
  const vendorKey = normalizeVendor(candidate.vendor);

  for (const doc of existing) {
    if (doc.vehicle_id !== candidate.vehicleId) continue;
    if (doc.type !== candidate.type) continue;

    if (
      candidate.pageHash &&
      doc.notes?.includes(`pageHash:${candidate.pageHash}`)
    ) {
      return doc;
    }
  }

  let best: { doc: Document; score: number } | null = null;

  for (const doc of existing) {
    if (doc.vehicle_id !== candidate.vehicleId) continue;
    if (doc.type !== candidate.type) continue;

    if (!datesMatch(candidate.date, doc.date)) continue;
    if (!amountsMatch(candidate.amount, doc.amount)) continue;

    let score = 0.7;
    const vendorScore = vendorSimilarity(vendorKey, normalizeVendor(doc.vendor));
    if (vendorScore > 0) {
      score += vendorScore * 0.3;
    }

    if (!best || score > best.score) {
      best = { doc, score };
    }
  }

  return best?.doc ?? null;
}

/** User-facing hint when a likely duplicate blocks save until confirmed. */
export function buildDuplicateDocumentHint(existing: Document): string {
  const title = displayDocumentTitle(existing.title);
  const dateLabel = formatDocumentDateCompact(existing.date);
  return `Ein ähnlicher Beleg existiert bereits („${title}", ${dateLabel}). Trotzdem als neuen Beleg speichern?`;
}
