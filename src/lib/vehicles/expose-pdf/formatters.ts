import { formatCompactGermanDate } from "@/lib/documents/format";

export function formatGermanDate(isoDate: string | null | undefined): string {
  if (!isoDate?.trim()) return "—";
  const compact = formatCompactGermanDate(isoDate.trim());
  return compact || "—";
}

export function formatMileageKm(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return "—";
  return `${Math.round(km).toLocaleString("de-DE")} km`;
}

export function formatCurrencyEur(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPower(
  powerPs: number | null,
  powerKw: number | null,
): string {
  const parts: string[] = [];
  if (powerPs != null && Number.isFinite(powerPs)) {
    parts.push(`${Math.round(powerPs)} PS`);
  }
  if (powerKw != null && Number.isFinite(powerKw)) {
    parts.push(`${Math.round(powerKw)} kW`);
  }
  return parts.length > 0 ? parts.join(" / ") : "—";
}

export function fallbackText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "—";
}

export function sanitizePdfFilename(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `Expose-${slug || "Fahrzeug"}.pdf`;
}

export function resolvePublicSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      /* fall through */
    }
  }
  return "https://zeloxtag.com";
}

export function buildPublicProfileUrl(publicSlug: string | null): string {
  const origin = resolvePublicSiteOrigin();
  if (publicSlug?.trim()) {
    return `${origin}/v/${publicSlug.trim()}`;
  }
  return origin;
}
