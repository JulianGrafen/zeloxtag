"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { LocaleContext } from "@/lib/i18n/context/locale-context";
import {
  EN_CURRENCY_COOKIE_NAME,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  serializeEnCurrencyCookie,
  serializeLocaleCookie,
} from "@/lib/i18n/locale-cookie";
import { buildRegionalProfile } from "@/lib/i18n/regional-profile";
import { resolveLocalePreferences } from "@/lib/i18n/resolve-locale";
import type { LocalePreferences } from "@/lib/i18n/types";

function writeClientCookie(name: string, value: string): void {
  const maxAge = LOCALE_COOKIE_MAX_AGE_SECONDS;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function readClientCookie(name: string): string | null {
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

function readBrowserPreferences(): LocalePreferences {
  return resolveLocalePreferences({
    cookieLocale: readClientCookie(LOCALE_COOKIE_NAME),
    cookieEnCurrency: readClientCookie(EN_CURRENCY_COOKIE_NAME),
    navigatorLanguages:
      typeof navigator !== "undefined" ? navigator.languages : null,
  });
}

export function LocaleProvider({
  children,
  initialPreferences,
}: {
  children: ReactNode;
  initialPreferences?: LocalePreferences;
}) {
  const [preferences, setPreferencesState] = useState<LocalePreferences>(
    initialPreferences ?? { locale: "de", enCurrency: "usd" },
  );

  useEffect(() => {
    if (initialPreferences) return;
    setPreferencesState(readBrowserPreferences());
  }, [initialPreferences]);

  const setPreferences = useCallback((next: LocalePreferences) => {
    setPreferencesState(next);
    writeClientCookie(LOCALE_COOKIE_NAME, serializeLocaleCookie(next.locale));
    writeClientCookie(
      EN_CURRENCY_COOKIE_NAME,
      serializeEnCurrencyCookie(next.enCurrency),
    );
    if (typeof document !== "undefined") {
      document.documentElement.lang = next.locale === "de" ? "de" : "en";
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = preferences.locale === "de" ? "de" : "en";
  }, [preferences.locale]);

  const profile = useMemo(
    () => buildRegionalProfile(preferences),
    [preferences],
  );

  const value = useMemo(
    () => ({
      preferences,
      profile,
      setPreferences,
    }),
    [preferences, profile, setPreferences],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
