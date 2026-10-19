"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  EN_CURRENCY_COOKIE_NAME,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  serializeEnCurrencyCookie,
  serializeLocaleCookie,
} from "@/lib/i18n/locale-cookie";
import { isAppLocale, isEnCurrency } from "@/lib/i18n/locales";
import { createClient } from "@/lib/supabase/server";
import type { AppLocale, EnCurrency } from "@/lib/i18n/types";

export type UpdateAppLocaleResult =
  | { status: "ok"; locale: AppLocale; enCurrency: EnCurrency }
  | { status: "error"; message: string };

export async function updateAppLocaleAction(input: {
  locale: string;
  enCurrency?: string;
}): Promise<UpdateAppLocaleResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Nicht angemeldet." };
  }

  const localeRaw = input.locale.trim().toLowerCase();
  if (!isAppLocale(localeRaw)) {
    return { status: "error", message: "Ungültige Sprache." };
  }

  let enCurrency: EnCurrency = "usd";
  if (localeRaw === "en") {
    const currencyRaw = input.enCurrency?.trim().toLowerCase() ?? "usd";
    if (!isEnCurrency(currencyRaw)) {
      return { status: "error", message: "Ungültige Währung." };
    }
    enCurrency = currencyRaw;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: {
      app_locale: localeRaw,
      en_currency: enCurrency,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  const cookieStore = await cookies();
  const cookieOptions = {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax" as const,
  };
  cookieStore.set(LOCALE_COOKIE_NAME, serializeLocaleCookie(localeRaw), cookieOptions);
  cookieStore.set(
    EN_CURRENCY_COOKIE_NAME,
    serializeEnCurrencyCookie(enCurrency),
    cookieOptions,
  );

  revalidatePath("/settings");
  revalidatePath("/settings/language");
  revalidatePath("/", "layout");

  return { status: "ok", locale: localeRaw, enCurrency };
}
