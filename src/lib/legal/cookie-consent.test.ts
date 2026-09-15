import { describe, expect, it } from "vitest";

import {
  buildCookieConsentPayload,
  COOKIE_CONSENT_VERSION,
  isValidCookieConsentValue,
  parseCookieConsentValue,
  serializeCookieConsentValue,
} from "@/lib/legal/cookie-consent";

describe("cookie-consent", () => {
  it("round-trips a valid payload", () => {
    const payload = buildCookieConsentPayload(new Date("2026-01-15T12:00:00.000Z"));
    const raw = serializeCookieConsentValue(payload);
    expect(parseCookieConsentValue(raw)).toEqual(payload);
    expect(isValidCookieConsentValue(raw)).toBe(true);
  });

  it("rejects wrong version", () => {
    const raw = JSON.stringify({ v: 0, t: "2026-01-15T12:00:00.000Z" });
    expect(parseCookieConsentValue(raw)).toBeNull();
    expect(isValidCookieConsentValue(raw)).toBe(false);
  });

  it("rejects malformed json", () => {
    expect(parseCookieConsentValue("{")).toBeNull();
    expect(isValidCookieConsentValue(null)).toBe(false);
  });

  it("uses current consent version", () => {
    expect(buildCookieConsentPayload().v).toBe(COOKIE_CONSENT_VERSION);
  });
});
