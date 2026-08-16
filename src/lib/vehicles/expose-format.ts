const DE_DATE: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

export function formatExposeDate(isoDate: string | null | undefined): string {
  if (!isoDate?.trim()) return "—";
  const normalized = isoDate.trim().slice(0, 10);
  const parsed = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("de-DE", DE_DATE);
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
