/**
 * Live-Scan notifications: pure helpers (no I/O) shared by the scan route,
 * the owner e-mail and the dashboard card.
 */

/** At a car meet dozens of people scan within minutes — one mail per window. */
export const TAG_SCAN_NOTIFY_THROTTLE_MS = 30 * 60 * 1000;

/** Scan events older than this are purged on write. */
export const TAG_SCAN_RETENTION_DAYS = 90;

/** Same browser re-opening the page within this window counts once. */
export const TAG_SCAN_CLIENT_DEDUPE_MS = 10 * 60 * 1000;

/** Owner dashboard payload of `GET /api/vehicle/{id}/scans`. */
export type VehicleScanSummary = {
  isPro: boolean;
  todayCount: number;
  last7DaysCount: number;
  totalCount: number;
  /** Pro only — empty for free owners (teaser shows counts, no time/place). */
  recent: { scannedAt: string; city: string | null; country: string | null }[];
};

export type TagScanLocation = {
  city: string | null;
  region: string | null;
  country: string | null;
};

function decodeHeader(value: string | null, maxLength: number): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    // Keep raw value when the platform did not percent-encode it.
  }
  const clean = decoded.replace(/[\u0000-\u001f<>]/g, "").trim();
  return clean ? clean.slice(0, maxLength) : null;
}

/**
 * Coarse location from hosting-edge geo headers (Vercel). Never reads the IP.
 * Returns all-null outside Vercel (local dev, self-hosting).
 */
export function tagScanLocationFromHeaders(headers: Headers): TagScanLocation {
  const country = decodeHeader(headers.get("x-vercel-ip-country"), 2);
  return {
    city: decodeHeader(headers.get("x-vercel-ip-city"), 80),
    region: decodeHeader(headers.get("x-vercel-ip-country-region"), 16),
    country: country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : null,
  };
}

const BOT_USER_AGENT =
  /bot|crawler|spider|crawling|preview|facebookexternalhit|whatsapp|telegram|slack|discord|embedly|headless|lighthouse|curl|wget|python-requests|httpclient/i;

/** Link-preview fetchers and crawlers must not trigger „Dein Fahrzeug wurde gescannt“. */
export function isLikelyBotUserAgent(userAgent: string | null): boolean {
  if (!userAgent?.trim()) return true;
  return BOT_USER_AGENT.test(userAgent);
}

export function shouldNotifyTagScan(
  lastNotifiedAt: string | null,
  nowMs = Date.now(),
): boolean {
  if (!lastNotifiedAt) return true;
  const last = Date.parse(lastNotifiedAt);
  if (!Number.isFinite(last)) return true;
  return nowMs - last >= TAG_SCAN_NOTIFY_THROTTLE_MS;
}

const COUNTRY_LABELS: Record<string, string> = {
  DE: "Deutschland",
  AT: "Österreich",
  CH: "Schweiz",
  NL: "Niederlande",
  BE: "Belgien",
  LU: "Luxemburg",
  FR: "Frankreich",
  IT: "Italien",
  PL: "Polen",
  CZ: "Tschechien",
  DK: "Dänemark",
};

/** „in der Nähe von München“ / „in Österreich“ / null. */
export function formatTagScanLocation(location: TagScanLocation): string | null {
  if (location.city) {
    return `in der Nähe von ${location.city}`;
  }
  if (location.country) {
    return `in ${COUNTRY_LABELS[location.country] ?? location.country}`;
  }
  return null;
}

/** „14:32 Uhr“ in German local time (Europe/Berlin). */
export function formatTagScanTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(date)} Uhr`;
}

/** „heute, 14:32 Uhr“ / „gestern, 21:05 Uhr“ / „12.10., 18:00 Uhr“. */
export function formatTagScanRelative(iso: string, nowMs = Date.now()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const dayKey = (value: Date) =>
    new Intl.DateTimeFormat("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Europe/Berlin",
    }).format(value);
  const today = dayKey(new Date(nowMs));
  const yesterday = dayKey(new Date(nowMs - 24 * 60 * 60 * 1000));
  const scanDay = dayKey(date);
  const time = formatTagScanTime(iso);
  if (scanDay === today) return `heute, ${time}`;
  if (scanDay === yesterday) return `gestern, ${time}`;
  const short = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(date);
  return `${short}, ${time}`;
}

/** Opt-out lives in auth user metadata, like maintenance reminders. Default on. */
export function isTagScanEmailEnabled(
  userMetadata: Record<string, unknown> | undefined | null,
): boolean {
  return userMetadata?.tag_scan_email_notifications !== false;
}
