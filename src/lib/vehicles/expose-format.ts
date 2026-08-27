import { formatCompactGermanDate } from "@/lib/documents/format";

export function formatExposeDate(isoDate: string | null | undefined): string {
  if (!isoDate?.trim()) return "—";
  const compact = formatCompactGermanDate(isoDate.trim());
  return compact || "—";
}

export function formatExposeMileage(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return "—";
  return `${Math.round(km).toLocaleString("de-DE")} km`;
}

export function formatExposeCurrency(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}
