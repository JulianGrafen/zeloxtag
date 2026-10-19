import {
  DEFAULT_APP_LOCALE,
  DEFAULT_EN_CURRENCY,
  intlLocaleTag,
} from "@/lib/i18n/locales";
import type {
  AppLocale,
  EnCurrency,
  LocalePreferences,
  RegionalProfile,
} from "@/lib/i18n/types";

export function buildRegionalProfile(
  preferences: LocalePreferences,
): RegionalProfile {
  const locale = preferences.locale;
  const enCurrency = preferences.enCurrency;

  if (locale === "de") {
    return {
      locale: "de",
      intlLocale: intlLocaleTag("de", DEFAULT_EN_CURRENCY),
      currency: "EUR",
      distanceUnit: "km",
      powerLabel: "PS",
    };
  }

  return {
    locale: "en",
    intlLocale: intlLocaleTag("en", enCurrency),
    currency: enCurrency === "gbp" ? "GBP" : "USD",
    distanceUnit: "mi",
    powerLabel: "HP",
  };
}

export function defaultLocalePreferences(): LocalePreferences {
  return {
    locale: DEFAULT_APP_LOCALE,
    enCurrency: DEFAULT_EN_CURRENCY,
  };
}

export function defaultRegionalProfile(): RegionalProfile {
  return buildRegionalProfile(defaultLocalePreferences());
}

export function regionalProfileForLocale(
  locale: AppLocale,
  enCurrency: EnCurrency = DEFAULT_EN_CURRENCY,
): RegionalProfile {
  return buildRegionalProfile({ locale, enCurrency });
}
