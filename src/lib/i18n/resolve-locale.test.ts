import { describe, expect, it } from "vitest";

import { resolveLocalePreferences } from "@/lib/i18n/resolve-locale";

describe("resolveLocalePreferences", () => {
  it("prefers user metadata over cookie", () => {
    expect(
      resolveLocalePreferences({
        metadataLocale: "en",
        metadataEnCurrency: "gbp",
        cookieLocale: "de",
        cookieEnCurrency: "usd",
      }),
    ).toEqual({ locale: "en", enCurrency: "gbp" });
  });

  it("falls back to cookie when metadata missing", () => {
    expect(
      resolveLocalePreferences({
        cookieLocale: "en",
        cookieEnCurrency: "usd",
      }),
    ).toEqual({ locale: "en", enCurrency: "usd" });
  });

  it("uses Accept-Language when no prefs", () => {
    expect(
      resolveLocalePreferences({
        acceptLanguage: "en-US,en;q=0.9",
      }),
    ).toEqual({ locale: "en", enCurrency: "usd" });
  });

  it("defaults to de", () => {
    expect(resolveLocalePreferences({})).toEqual({
      locale: "de",
      enCurrency: "usd",
    });
  });
});
