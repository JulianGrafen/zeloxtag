import { createHash } from "crypto";

import type { Document, DocumentType } from "@/types/database";

import { sanitizeVendorForStorage } from "./sanitize-vendor";

export function documentPageHash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 16);
}

function normalizeVendor(vendor: string | null): string {
  const { vendor: cleaned } = sanitizeVendorForStorage(vendor);
  return (cleaned ?? "").toLowerCase().replace(/\s+/g, " ");
}

function fuzzyAmount(a: number | null, b: number | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) < 0.02;
}

function fuzzyDate(a: string | null, b: string | null): boolean {
  if (!a || !b) return a === b;
  return a.slice(0, 10) === b.slice(0, 10);
}

function vendorSimilarity(a: string, b: string): number {
  if (!a || !b) return a === b ? 1 : 0;
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

const MATCH_THRESHOLD = 0.72;

/**
 * Fuzzy-match against existing vehicle documents (date + amount + vendor + page hash).
 */
export function findDuplicateDocument(
  existing: Document[],
  candidate: DuplicateMatchInput,
): Document | null {
  const vendorKey = normalizeVendor(candidate.vendor);
  let best: { doc: Document; score: number } | null = null;

  for (const doc of existing) {
    if (doc.vehicle_id !== candidate.vehicleId) continue;
    if (doc.type !== candidate.type) continue;

    let score = 0;
    let factors = 0;

    if (candidate.pageHash && doc.notes?.includes(`pageHash:${candidate.pageHash}`)) {
      score += 1;
      factors += 1;
    }

    if (fuzzyDate(candidate.date, doc.date)) {
      score += 0.35;
      factors += 1;
    }
    if (fuzzyAmount(candidate.amount, doc.amount)) {
      score += 0.35;
      factors += 1;
    }

    const vendorScore = vendorSimilarity(vendorKey, normalizeVendor(doc.vendor));
    if (vendorScore > 0) {
      score += vendorScore * 0.3;
      factors += 1;
    }

    const normalizedScore = factors > 0 ? score / Math.max(1, factors * 0.35) : 0;
    if (normalizedScore >= MATCH_THRESHOLD && (!best || normalizedScore > best.score)) {
      best = { doc, score: normalizedScore };
    }
  }

  return best?.doc ?? null;
}
