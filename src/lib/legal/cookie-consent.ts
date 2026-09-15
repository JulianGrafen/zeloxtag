/** First-party cookie consent (no third-party CMP). */

export const COOKIE_CONSENT_NAME = "zt_cookie_consent";

/** Bump when banner copy or legal basis changes materially. */
export const COOKIE_CONSENT_VERSION = 1;

/** ~12 months */
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type CookieConsentPayload = {
  v: number;
  /** ISO 8601 timestamp when the user acknowledged the notice */
  t: string;
};

export function serializeCookieConsentValue(
  payload: CookieConsentPayload,
): string {
  return JSON.stringify(payload);
}

export function parseCookieConsentValue(
  raw: string | null | undefined,
): CookieConsentPayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as CookieConsentPayload;
    if (
      typeof parsed.v !== "number" ||
      parsed.v !== COOKIE_CONSENT_VERSION ||
      typeof parsed.t !== "string" ||
      !parsed.t.trim()
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isValidCookieConsentValue(
  raw: string | null | undefined,
): boolean {
  return parseCookieConsentValue(raw) !== null;
}

export function buildCookieConsentPayload(
  acceptedAt: Date = new Date(),
): CookieConsentPayload {
  return {
    v: COOKIE_CONSENT_VERSION,
    t: acceptedAt.toISOString(),
  };
}
