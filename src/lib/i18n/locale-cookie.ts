import type { AppLocale, EnCurrency } from "@/lib/i18n/types";
import {
  DEFAULT_APP_LOCALE,
  DEFAULT_EN_CURRENCY,
  isAppLocale,
  isEnCurrency,
} from "@/lib/i18n/locales";

export const LOCALE_COOKIE_NAME = "zt_locale";
export const EN_CURRENCY_COOKIE_NAME = "zt_en_currency";

export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function parseLocaleCookie(value: string | null | undefined): AppLocale | null {
  if (!value?.trim()) return null;
  const normalized = value.trim().toLowerCase();
  return isAppLocale(normalized) ? normalized : null;
}

export function parseEnCurrencyCookie(
  value: string | null | undefined,
): EnCurrency | null {
  if (!value?.trim()) return null;
  const normalized = value.trim().toLowerCase();
  return isEnCurrency(normalized) ? normalized : null;
}

export function serializeLocaleCookie(locale: AppLocale): string {
  return locale;
}

export function serializeEnCurrencyCookie(currency: EnCurrency): string {
  return currency;
}

export function readLocaleFromCookieHeader(
  cookieHeader: string | null | undefined,
): { locale: AppLocale | null; enCurrency: EnCurrency | null } {
  if (!cookieHeader?.trim()) {
    return { locale: null, enCurrency: null };
  }

  let locale: AppLocale | null = null;
  let enCurrency: EnCurrency | null = null;

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    const key = rawKey?.trim();
    const value = rest.join("=").trim();
    if (key === LOCALE_COOKIE_NAME) {
      locale = parseLocaleCookie(decodeURIComponent(value));
    }
    if (key === EN_CURRENCY_COOKIE_NAME) {
      enCurrency = parseEnCurrencyCookie(decodeURIComponent(value));
    }
  }

  return { locale, enCurrency };
}

export function cookieDefaults(): {
  locale: AppLocale;
  enCurrency: EnCurrency;
} {
  return {
    locale: DEFAULT_APP_LOCALE,
    enCurrency: DEFAULT_EN_CURRENCY,
  };
}
