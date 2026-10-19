import type { AppLocale, EnCurrency } from "@/lib/i18n/types";

export const DEFAULT_APP_LOCALE: AppLocale = "de";
export const DEFAULT_EN_CURRENCY: EnCurrency = "usd";

export const SUPPORTED_APP_LOCALES: readonly AppLocale[] = ["de", "en"] as const;

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "de" || value === "en";
}

export function isEnCurrency(value: string | null | undefined): value is EnCurrency {
  return value === "usd" || value === "gbp";
}

export function intlLocaleTag(locale: AppLocale, enCurrency: EnCurrency): string {
  if (locale === "de") {
    return "de-DE";
  }
  return enCurrency === "gbp" ? "en-GB" : "en-US";
}
