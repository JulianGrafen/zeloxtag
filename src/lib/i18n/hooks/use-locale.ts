"use client";

import { useLocaleContext } from "@/lib/i18n/context/locale-context";
import { uiMessages } from "@/lib/i18n/messages";

export function useLocale() {
  const { preferences, profile, setPreferences } = useLocaleContext();
  return {
    locale: preferences.locale,
    enCurrency: preferences.enCurrency,
    preferences,
    profile,
    setPreferences,
    messages: uiMessages(preferences.locale),
  };
}
