import { serviceCategoryLabel } from "./category-presets";
import type { ServiceRecord, ServiceRecordCategory } from "./service-record";

const KM_SOON_THRESHOLD = 1_500;
const DAYS_SOON_THRESHOLD = 30;

export type ServiceDueTone = "default" | "warning" | "critical";

export type ServiceDueAlert = {
  label: string;
  tone: ServiceDueTone;
  category: ServiceRecordCategory;
};

export type ServiceDueContext = {
  currentMileageKm: number | null;
  now?: Date;
};

function wholeDaysUntil(isoDate: string, now: Date): number {
  const target = Date.parse(
    isoDate.length === 10 ? `${isoDate}T12:00:00.000Z` : isoDate,
  );
  if (!Number.isFinite(target)) return 999_999;
  const today = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }),
  );
  today.setHours(0, 0, 0, 0);
  const targetLocal = new Date(target);
  targetLocal.setHours(0, 0, 0, 0);
  return Math.ceil(
    (targetLocal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function latestByCategory(
  records: ServiceRecord[],
): Map<ServiceRecordCategory, ServiceRecord> {
  const map = new Map<ServiceRecordCategory, ServiceRecord>();
  for (const record of records) {
    const existing = map.get(record.category);
    if (!existing || record.date.localeCompare(existing.date) > 0) {
      map.set(record.category, record);
    }
  }
  return map;
}

function urgencyScore(input: {
  kmUntil: number | null;
  daysUntil: number | null;
}): { score: number; tone: ServiceDueTone } | null {
  const km = input.kmUntil;
  const days = input.daysUntil;

  if (km != null && km <= 0) return { score: -km, tone: "critical" };
  if (days != null && days <= 0) return { score: 10_000 - days, tone: "critical" };

  const kmSoon = km != null && km < KM_SOON_THRESHOLD;
  const daysSoon = days != null && days < DAYS_SOON_THRESHOLD;
  if (!kmSoon && !daysSoon) return null;

  const score =
    (kmSoon ? KM_SOON_THRESHOLD - (km ?? KM_SOON_THRESHOLD) : 0) +
    (daysSoon ? (DAYS_SOON_THRESHOLD - (days ?? DAYS_SOON_THRESHOLD)) * 10 : 0);

  return { score, tone: "warning" };
}

export function pickUrgentServiceAlert(
  records: ServiceRecord[],
  ctx: ServiceDueContext,
): ServiceDueAlert | null {
  const now = ctx.now ?? new Date();
  const currentKm = ctx.currentMileageKm;
  const byCategory = latestByCategory(records);

  let best: { alert: ServiceDueAlert; score: number } | null = null;

  for (const [category, record] of byCategory) {
    const kmUntil =
      currentKm != null && record.nextIntervalMileage != null
        ? record.nextIntervalMileage - currentKm
        : null;
    const daysUntil = record.nextIntervalDate
      ? wholeDaysUntil(record.nextIntervalDate, now)
      : null;

    const urgency = urgencyScore({ kmUntil, daysUntil });
    if (!urgency) continue;

    const label = formatUrgentLabel({
      category,
      kmUntil,
      daysUntil,
    });

    if (!best || urgency.score > best.score) {
      best = {
        score: urgency.score,
        alert: { label, tone: urgency.tone, category },
      };
    }
  }

  return best?.alert ?? null;
}

function formatUrgentLabel(input: {
  category: ServiceRecordCategory;
  kmUntil: number | null;
  daysUntil: number | null;
}): string {
  const name = serviceCategoryLabel(input.category);
  if (input.kmUntil != null && input.kmUntil <= 0) {
    return `${name} überfällig (${Math.abs(input.kmUntil).toLocaleString("de-DE")} km)`;
  }
  if (input.daysUntil != null && input.daysUntil <= 0) {
    return `${name} überfällig (${Math.abs(input.daysUntil)} Tage)`;
  }
  if (input.kmUntil != null && input.kmUntil < KM_SOON_THRESHOLD) {
    return `${name} fällig in ${input.kmUntil.toLocaleString("de-DE")} km`;
  }
  if (input.daysUntil != null && input.daysUntil < DAYS_SOON_THRESHOLD) {
    return `${name} fällig in ${input.daysUntil} Tagen`;
  }
  return `${name} bald fällig`;
}

export function formatLastServiceSubtitle(
  records: ServiceRecord[],
  ctx: ServiceDueContext,
): string | null {
  const latest = records[0];
  if (!latest) return null;

  const currentKm = ctx.currentMileageKm;
  if (currentKm != null && latest.mileage > 0 && currentKm >= latest.mileage) {
    const delta = currentKm - latest.mileage;
    return `Letzter Service: ${latest.title} vor ${delta.toLocaleString("de-DE")} km`;
  }

  return `Letzter Service: ${latest.title}`;
}

export function buildServiceMaintenanceTileMeta(
  records: ServiceRecord[],
  ctx: ServiceDueContext,
): { subtitle: string; tone?: ServiceDueTone } {
  const urgent = pickUrgentServiceAlert(records, ctx);
  if (urgent) {
    return { subtitle: urgent.label, tone: urgent.tone };
  }
  const fallback = formatLastServiceSubtitle(records, ctx);
  return { subtitle: fallback ?? "Noch offen" };
}
