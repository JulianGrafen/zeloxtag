import type { Document } from "@/types/database";

export type MileageValidation = {
  ok: boolean;
  warning: string | null;
};

/**
 * Reject or flag km readings that jump backwards >20% vs the previous dated entry.
 */
export function validateMileageAgainstHistory(
  mileageKm: number | null,
  date: string | null,
  existing: Document[],
): MileageValidation {
  if (mileageKm === null || mileageKm <= 0) {
    return { ok: true, warning: null };
  }

  const dated = existing
    .filter(
      (doc) =>
        typeof doc.mileage_km === "number" &&
        doc.mileage_km > 0 &&
        (doc.date ?? doc.created_at.slice(0, 10)),
    )
    .map((doc) => ({
      km: doc.mileage_km as number,
      date: doc.date ?? doc.created_at.slice(0, 10),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const prior =
    date === null
      ? dated[0]
      : dated.find((row) => row.date <= date) ?? dated[0];

  if (!prior || prior.km <= mileageKm) {
    return { ok: true, warning: null };
  }

  const dropRatio = (prior.km - mileageKm) / prior.km;
  if (dropRatio <= 0.2) {
    return { ok: true, warning: null };
  }

  return {
    ok: false,
    warning: `Kilometerstand (${mileageKm.toLocaleString("de-DE")} km) liegt deutlich unter dem letzten Eintrag (${prior.km.toLocaleString("de-DE")} km). Bitte prüfen.`,
  };
}
