export type {
  AppLocale,
  EnCurrency,
  LocalePreferences,
  LocaleResolutionInput,
  RegionalProfile,
} from "@/lib/i18n/types";
export {
  DEFAULT_APP_LOCALE,
  DEFAULT_EN_CURRENCY,
  SUPPORTED_APP_LOCALES,
  intlLocaleTag,
  isAppLocale,
  isEnCurrency,
} from "@/lib/i18n/locales";
export {
  buildRegionalProfile,
  defaultLocalePreferences,
  defaultRegionalProfile,
  regionalProfileForLocale,
} from "@/lib/i18n/regional-profile";
export {
  resolveLocalePreferences,
  resolveRegionalProfile,
} from "@/lib/i18n/resolve-locale";
export {
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  EN_CURRENCY_COOKIE_NAME,
  parseEnCurrencyCookie,
  parseLocaleCookie,
} from "@/lib/i18n/locale-cookie";
export {
  formatCount,
  formatDistanceFromKm,
  formatDistanceNumberFromKm,
  formatDocumentDateEmpty,
  formatIsoDateCompact,
  formatMoney,
  formatPowerFromPs,
  formatPowerLabel,
} from "@/lib/i18n/formatters";
export { getTerm, type TermKey } from "@/lib/i18n/terminology";
export { uiMessages, type UiMessages } from "@/lib/i18n/messages";
export { kilometersToMiles, milesToKilometers } from "@/lib/i18n/units-convert";
export {
  getRequestLocale,
  getRequestLocalePreferences,
} from "@/lib/i18n/get-request-locale";
export { normalizeInvoiceMileageKmForLocale } from "@/lib/i18n/ocr/mileage-locale-normalize";
export {
  buildHybridInvoiceSystemPrompt,
  buildInvoiceHeaderSystemPrompt,
  buildInvoiceSystemPrompt,
  buildInvoiceVisionSystemPrompt,
} from "@/lib/i18n/ocr/invoice-prompts";
