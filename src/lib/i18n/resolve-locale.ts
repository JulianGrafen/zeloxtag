import {
  DEFAULT_APP_LOCALE,
  DEFAULT_EN_CURRENCY,
  isAppLocale,
  isEnCurrency,
} from "@/lib/i18n/locales";
import { buildRegionalProfile } from "@/lib/i18n/regional-profile";
import type {
  AppLocale,
  EnCurrency,
  LocalePreferences,
  LocaleResolutionInput,
  RegionalProfile,
} from "@/lib/i18n/types";

function parseMetadataLocale(value: string | null | undefined): AppLocale | null {
  const normalized = value?.trim().toLowerCase();
  return isAppLocale(normalized) ? normalized : null;
}

function parseMetadataEnCurrency(
  value: string | null | undefined,
): EnCurrency | null {
  const normalized = value?.trim().toLowerCase();
  return isEnCurrency(normalized) ? normalized : null;
}

function localeFromAcceptLanguage(header: string | null | undefined): AppLocale | null {
  if (!header?.trim()) return null;
  const first = header.split(",")[0]?.trim().toLowerCase();
  if (!first) return null;
  if (first.startsWith("de")) return "de";
  if (first.startsWith("en")) return "en";
  return null;
}

function localeFromNavigatorLanguages(
  languages: readonly string[] | null | undefined,
): AppLocale | null {
  if (!languages?.length) return null;
  for (const tag of languages) {
    const lower = tag.trim().toLowerCase();
    if (lower.startsWith("de")) return "de";
    if (lower.startsWith("en")) return "en";
  }
  return null;
}

export function resolveLocalePreferences(
  input: LocaleResolutionInput,
): LocalePreferences {
  const metadataLocale = parseMetadataLocale(input.metadataLocale);
  const metadataEnCurrency = parseMetadataEnCurrency(input.metadataEnCurrency);

  const cookieLocaleRaw = input.cookieLocale?.trim().toLowerCase();
  const cookieLocale: AppLocale | null = isAppLocale(cookieLocaleRaw)
    ? cookieLocaleRaw
    : null;
  const cookieEnCurrencyRaw = input.cookieEnCurrency?.trim().toLowerCase();
  const cookieEnCurrency: EnCurrency | null = isEnCurrency(cookieEnCurrencyRaw)
    ? cookieEnCurrencyRaw
    : null;

  const locale =
    metadataLocale ??
    cookieLocale ??
    localeFromAcceptLanguage(input.acceptLanguage) ??
    localeFromNavigatorLanguages(input.navigatorLanguages) ??
    DEFAULT_APP_LOCALE;

  const enCurrency =
    locale === "en"
      ? metadataEnCurrency ??
        cookieEnCurrency ??
        DEFAULT_EN_CURRENCY
      : DEFAULT_EN_CURRENCY;

  return { locale, enCurrency };
}

export function resolveRegionalProfile(
  input: LocaleResolutionInput,
): RegionalProfile {
  return buildRegionalProfile(resolveLocalePreferences(input));
}
