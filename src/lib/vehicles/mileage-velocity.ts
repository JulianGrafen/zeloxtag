import type { Document } from "@/types/database";

export type MileageSample = {
  isoDate: string;
  mileageKm: number;
};

const MIN_SEGMENT_DAYS = 14;
const MAX_KM_PER_DAY = 2_000;

function parseIsoDateMs(iso: string): number | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const ms = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isFinite(ms) ? ms : null;
}

export function mileageSamplesFromDocuments(
  documents: Document[],
): MileageSample[] {
  const samples: MileageSample[] = [];
  for (const doc of documents) {
    const mileageKm = doc.mileage_km;
    if (typeof mileageKm !== "number" || !Number.isFinite(mileageKm) || mileageKm < 0) {
      continue;
    }
    const iso =
      doc.date?.trim().slice(0, 10) ||
      doc.created_at?.trim().slice(0, 10) ||
      null;
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
    samples.push({ isoDate: iso, mileageKm: Math.round(mileageKm) });
  }

  samples.sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  const deduped: MileageSample[] = [];
  for (const sample of samples) {
    const last = deduped[deduped.length - 1];
    if (last && last.isoDate === sample.isoDate) {
      last.mileageKm = Math.max(last.mileageKm, sample.mileageKm);
      continue;
    }
    deduped.push({ ...sample });
  }
  return deduped;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const a = sorted[mid - 1];
  const b = sorted[mid];
  if (a == null || b == null) return null;
  return (a + b) / 2;
}

/** Median km/day from chronological mileage samples; null if insufficient data. */
export function estimateKmPerDayFromDocuments(
  documents: Document[],
): number | null {
  const samples = mileageSamplesFromDocuments(documents);
  if (samples.length < 2) return null;

  const rates: number[] = [];
  for (let i = 1; i < samples.length; i += 1) {
    const prev = samples[i - 1];
    const curr = samples[i];
    const prevMs = parseIsoDateMs(prev.isoDate);
    const currMs = parseIsoDateMs(curr.isoDate);
    if (prevMs == null || currMs == null) continue;

    const dayDelta = (currMs - prevMs) / 86_400_000;
    if (dayDelta < MIN_SEGMENT_DAYS) continue;

    const kmDelta = curr.mileageKm - prev.mileageKm;
    if (kmDelta <= 0) continue;

    const rate = kmDelta / dayDelta;
    if (rate > MAX_KM_PER_DAY) continue;
    rates.push(rate);
  }

  const medianRate = median(rates);
  if (medianRate == null || medianRate <= 0) return null;
  return Math.round(medianRate * 10) / 10;
}

export function latestKnownMileageKm(documents: Document[]): number | null {
  const samples = mileageSamplesFromDocuments(documents);
  if (samples.length === 0) return null;
  return samples[samples.length - 1]?.mileageKm ?? null;
}

export function addDaysIso(isoDate: string, days: number): string | null {
  const ms = parseIsoDateMs(isoDate);
  if (ms == null) return null;
  const next = new Date(ms + days * 86_400_000);
  return next.toISOString().slice(0, 10);
}

/**
 * Estimate calendar due date when target km is reached at kmPerDay from reference km/date.
 */
export function estimateDueDateFromKm(input: {
  referenceIsoDate: string;
  referenceMileageKm: number;
  targetMileageKm: number;
  kmPerDay: number;
}): string | null {
  const { referenceIsoDate, referenceMileageKm, targetMileageKm, kmPerDay } =
    input;
  if (kmPerDay <= 0 || targetMileageKm <= referenceMileageKm) {
    return referenceIsoDate;
  }
  const kmRemaining = targetMileageKm - referenceMileageKm;
  const days = Math.ceil(kmRemaining / kmPerDay);
  return addDaysIso(referenceIsoDate, days);
}
