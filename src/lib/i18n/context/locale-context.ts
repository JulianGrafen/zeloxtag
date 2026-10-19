"use client";

import { createContext, useContext } from "react";

import type { LocalePreferences, RegionalProfile } from "@/lib/i18n/types";

export type LocaleContextValue = {
  preferences: LocalePreferences;
  profile: RegionalProfile;
  setPreferences: (next: LocalePreferences) => void;
};

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocaleContext(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useLocaleContext must be used within LocaleProvider");
  }
  return value;
}
