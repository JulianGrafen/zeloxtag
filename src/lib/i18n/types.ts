export type AppLocale = "de" | "en";

export type EnCurrency = "usd" | "gbp";

export type DistanceUnit = "km" | "mi";

export type PowerDisplayUnit = "PS" | "HP" | "WHP";

export type RegionalProfile = {
  locale: AppLocale;
  intlLocale: string;
  currency: "EUR" | "USD" | "GBP";
  distanceUnit: DistanceUnit;
  powerLabel: PowerDisplayUnit;
};

export type LocalePreferences = {
  locale: AppLocale;
  enCurrency: EnCurrency;
};

export type LocaleResolutionInput = {
  metadataLocale?: string | null;
  metadataEnCurrency?: string | null;
  cookieLocale?: string | null;
  cookieEnCurrency?: string | null;
  acceptLanguage?: string | null;
  navigatorLanguages?: readonly string[] | null;
};
