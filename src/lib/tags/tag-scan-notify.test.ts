import { describe, expect, it } from "vitest";

import {
  TAG_SCAN_NOTIFY_THROTTLE_MS,
  formatTagScanLocation,
  formatTagScanRelative,
  isLikelyBotUserAgent,
  isTagScanEmailEnabled,
  shouldNotifyTagScan,
  tagScanLocationFromHeaders,
} from "./tag-scan-notify";

describe("tagScanLocationFromHeaders", () => {
  it("decodes Vercel geo headers", () => {
    const headers = new Headers({
      "x-vercel-ip-city": "M%C3%BCnchen",
      "x-vercel-ip-country": "de",
      "x-vercel-ip-country-region": "BY",
    });
    expect(tagScanLocationFromHeaders(headers)).toEqual({
      city: "München",
      region: "BY",
      country: "DE",
    });
  });

  it("returns nulls without geo headers and rejects junk country codes", () => {
    expect(
      tagScanLocationFromHeaders(new Headers({ "x-vercel-ip-country": "<x>" })),
    ).toEqual({ city: null, region: null, country: null });
  });
});

describe("isLikelyBotUserAgent", () => {
  it("flags link previews and empty agents", () => {
    expect(isLikelyBotUserAgent("WhatsApp/2.23.20.0")).toBe(true);
    expect(isLikelyBotUserAgent("facebookexternalhit/1.1")).toBe(true);
    expect(isLikelyBotUserAgent(null)).toBe(true);
  });

  it("lets phone browsers through", () => {
    expect(
      isLikelyBotUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
  });
});

describe("shouldNotifyTagScan", () => {
  const now = Date.parse("2026-11-05T12:00:00Z");

  it("notifies on first scan and after the throttle window", () => {
    expect(shouldNotifyTagScan(null, now)).toBe(true);
    expect(
      shouldNotifyTagScan(
        new Date(now - TAG_SCAN_NOTIFY_THROTTLE_MS).toISOString(),
        now,
      ),
    ).toBe(true);
  });

  it("suppresses mails inside the throttle window", () => {
    expect(
      shouldNotifyTagScan(new Date(now - 5 * 60 * 1000).toISOString(), now),
    ).toBe(false);
  });
});

describe("formatting", () => {
  it("prefers city, falls back to country", () => {
    expect(
      formatTagScanLocation({ city: "Köln", region: null, country: "DE" }),
    ).toBe("in der Nähe von Köln");
    expect(
      formatTagScanLocation({ city: null, region: null, country: "AT" }),
    ).toBe("in Österreich");
    expect(
      formatTagScanLocation({ city: null, region: null, country: null }),
    ).toBeNull();
  });

  it("formats relative day in Berlin time", () => {
    const now = Date.parse("2026-11-05T15:00:00Z");
    expect(formatTagScanRelative("2026-11-05T13:32:00Z", now)).toBe(
      "heute, 14:32 Uhr",
    );
    expect(formatTagScanRelative("2026-11-04T20:05:00Z", now)).toBe(
      "gestern, 21:05 Uhr",
    );
  });

  it("defaults e-mail opt-in to on", () => {
    expect(isTagScanEmailEnabled(undefined)).toBe(true);
    expect(isTagScanEmailEnabled({ tag_scan_email_notifications: false })).toBe(
      false,
    );
  });
});
