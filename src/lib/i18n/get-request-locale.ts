import { cookies, headers } from "next/headers";

import { readLocaleFromCookieHeader } from "@/lib/i18n/locale-cookie";
import { resolveLocalePreferences, resolveRegionalProfile } from "@/lib/i18n/resolve-locale";
import type { LocalePreferences, RegionalProfile } from "@/lib/i18n/types";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function getRequestLocalePreferences(): Promise<LocalePreferences> {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const headerStore = await headers();

  const fromCookies = readLocaleFromCookieHeader(
    cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; "),
  );

  const metadata = user?.user_metadata as Record<string, unknown> | undefined;

  return resolveLocalePreferences({
    metadataLocale:
      typeof metadata?.app_locale === "string" ? metadata.app_locale : null,
    metadataEnCurrency:
      typeof metadata?.en_currency === "string" ? metadata.en_currency : null,
    cookieLocale: fromCookies.locale,
    cookieEnCurrency: fromCookies.enCurrency,
    acceptLanguage: headerStore.get("accept-language"),
  });
}

export async function getRequestLocale(): Promise<RegionalProfile> {
  const prefs = await getRequestLocalePreferences();
  return resolveRegionalProfile({
    metadataLocale: prefs.locale,
    metadataEnCurrency: prefs.enCurrency,
    cookieLocale: prefs.locale,
    cookieEnCurrency: prefs.enCurrency,
  });
}
