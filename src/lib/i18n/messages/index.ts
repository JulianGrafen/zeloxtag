import type { AppLocale } from "@/lib/i18n/types";

import { deMessages } from "@/lib/i18n/messages/de";
import { enMessages } from "@/lib/i18n/messages/en";

export type UiMessages = {
  settingsLanguageTitle: string;
  settingsLanguageBack: string;
  settingsLanguageIntro: string;
  languageLabel: string;
  languageDe: string;
  languageEn: string;
  enCurrencyLabel: string;
  enCurrencyUsd: string;
  enCurrencyGbp: string;
  saveSuccess: string;
  saveError: string;
  saving: string;
};

const MESSAGES: Record<AppLocale, UiMessages> = {
  de: deMessages,
  en: enMessages,
};

export function uiMessages(locale: AppLocale): UiMessages {
  return MESSAGES[locale];
}
