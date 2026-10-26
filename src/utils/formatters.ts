import { formatCompactGermanDate } from "@/lib/documents/format";
import { humanizeShowcaseLabel } from "@/lib/documents/humanize-showcase-label";
import { restoreGermanUmlauts } from "@/lib/i18n/german-umlauts";

export { restoreGermanUmlauts };

const DE_LOCALE = "de-DE";

const EUR_FORMATTER = new Intl.NumberFormat(DE_LOCALE, {
  style: "currency",
  currency: "EUR",
});

const EMPTY_VALUE = "—";

/** 2265.05 → "2.265,05 €". Returns "—" for missing / invalid values. */
export function formatCurrencyEUR(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return EMPTY_VALUE;
  return EUR_FORMATTER.format(amount);
}

/** 302400 → "302.400 km". Returns null when unknown. */
export function formatMileageKm(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km) || km < 0) return null;
  return `${Math.round(km).toLocaleString(DE_LOCALE)} km`;
}

/** ISO / OCR date → "23.09.2026". Returns null when empty. */
export function formatDateDE(isoOrRaw: string | null | undefined): string | null {
  if (!isoOrRaw?.trim()) return null;
  return formatCompactGermanDate(isoOrRaw) || null;
}

/** Trimmed invoice number with collapsed whitespace; null when empty. */
export function formatInvoiceNumber(raw: string | null | undefined): string | null {
  const value = raw?.replace(/\s+/g, " ").trim();
  return value ? value : null;
}

/** Display label for an invoice position: OCR glue stripped, umlauts restored. */
export function formatLineItemLabel(label: string): string {
  return restoreGermanUmlauts(humanizeShowcaseLabel(label));
}
