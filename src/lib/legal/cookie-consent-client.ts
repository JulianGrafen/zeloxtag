import {
  buildCookieConsentPayload,
  COOKIE_CONSENT_MAX_AGE_SECONDS,
  COOKIE_CONSENT_NAME,
  isValidCookieConsentValue,
  serializeCookieConsentValue,
} from "@/lib/legal/cookie-consent";

function readDocumentCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return null;
}

export function hasCookieConsent(): boolean {
  return isValidCookieConsentValue(readDocumentCookie(COOKIE_CONSENT_NAME));
}

export function acceptCookieConsent(acceptedAt: Date = new Date()): void {
  if (typeof document === "undefined") return;
  const value = serializeCookieConsentValue(
    buildCookieConsentPayload(acceptedAt),
  );
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = [
    `${COOKIE_CONSENT_NAME}=${encodeURIComponent(value)}`,
    `Max-Age=${COOKIE_CONSENT_MAX_AGE_SECONDS}`,
    "Path=/",
    "SameSite=Lax",
    secure,
  ].join("; ");
}
