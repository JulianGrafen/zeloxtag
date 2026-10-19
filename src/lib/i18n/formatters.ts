import { formatMilesFromKm } from "@/lib/i18n/units-convert";
import type { RegionalProfile } from "@/lib/i18n/types";
import { defaultRegionalProfile } from "@/lib/i18n/regional-profile";
import { getTerm } from "@/lib/i18n/terminology";

export function formatMoney(
  amount: number | null | undefined,
  profile: RegionalProfile = defaultRegionalProfile(),
): string | null {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return null;
  }
  return new Intl.NumberFormat(profile.intlLocale, {
    style: "currency",
    currency: profile.currency,
  }).format(amount);
}

export function formatCount(
  count: number,
  profile: RegionalProfile = defaultRegionalProfile(),
): string {
  return count.toLocaleString(profile.intlLocale);
}

export function formatDistanceFromKm(
  km: number | null | undefined,
  profile: RegionalProfile = defaultRegionalProfile(),
): string {
  if (km == null || !Number.isFinite(km)) {
    return "—";
  }
  if (profile.distanceUnit === "km") {
    const formatted = Math.round(km).toLocaleString(profile.intlLocale);
    return `${formatted} km`;
  }
  return `${formatMilesFromKm(km)} mi`;
}

export function formatDistanceNumberFromKm(
  km: number | null | undefined,
  profile: RegionalProfile = defaultRegionalProfile(),
): string {
  if (km == null || !Number.isFinite(km)) {
    return "";
  }
  if (profile.distanceUnit === "km") {
    return Math.round(km).toLocaleString(profile.intlLocale);
  }
  return formatMilesFromKm(km);
}

export function formatPowerFromPs(
  powerPs: number | null | undefined,
  profile: RegionalProfile = defaultRegionalProfile(),
): string | null {
  if (powerPs == null || !Number.isFinite(powerPs)) {
    return null;
  }
  return `${Math.round(powerPs)} ${profile.powerLabel}`;
}

export function formatPowerLabel(profile: RegionalProfile = defaultRegionalProfile()): string {
  return getTerm("powerSpec", profile.locale);
}

export function formatDocumentDateEmpty(
  profile: RegionalProfile = defaultRegionalProfile(),
): string {
  return getTerm("documentDateEmpty", profile.locale);
}

/** ISO YYYY-MM-DD → locale calendar display. */
export function formatIsoDateCompact(
  iso: string | null | undefined,
  profile: RegionalProfile = defaultRegionalProfile(),
): string {
  if (!iso?.trim()) return "";
  const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso.trim();
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return new Intl.DateTimeFormat(profile.intlLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
