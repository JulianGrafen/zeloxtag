"use client";

import { useState, useTransition } from "react";

import { updateAppLocaleAction } from "@/actions/update-app-locale";
import { useLocale } from "@/lib/i18n/hooks/use-locale";
import type { AppLocale, EnCurrency } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

const LOCALE_OPTIONS: { value: AppLocale; labelKey: "languageDe" | "languageEn" }[] =
  [
    { value: "de", labelKey: "languageDe" },
    { value: "en", labelKey: "languageEn" },
  ];

const CURRENCY_OPTIONS: { value: EnCurrency; labelKey: "enCurrencyUsd" | "enCurrencyGbp" }[] =
  [
    { value: "usd", labelKey: "enCurrencyUsd" },
    { value: "gbp", labelKey: "enCurrencyGbp" },
  ];

export function LanguageRegionSettings() {
  const { preferences, setPreferences, messages } = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function persist(next: { locale: AppLocale; enCurrency: EnCurrency }) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateAppLocaleAction(next);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setPreferences({
        locale: result.locale,
        enCurrency: result.enCurrency,
      });
      setSaved(true);
    });
  }

  return (
    <section
      aria-label={messages.settingsLanguageTitle}
      className="vd-surface-card space-y-6 p-5 shadow-[var(--vd-shadow-sm)]"
    >
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-[1.05rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
          {messages.languageLabel}
        </h2>
        <div
          className="mt-4 grid grid-cols-2 gap-2"
          role="radiogroup"
          aria-label={messages.languageLabel}
        >
          {LOCALE_OPTIONS.map(({ value, labelKey }) => {
            const selected = preferences.locale === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={pending}
                onClick={() =>
                  persist({
                    locale: value,
                    enCurrency: preferences.enCurrency,
                  })
                }
                className={cn(
                  "min-h-11 rounded-[var(--vd-radius-control)] border px-3 py-2.5 text-[0.82rem] font-medium transition",
                  selected
                    ? "border-[color:var(--vd-text)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)]"
                    : "border-[color:var(--vd-border)] text-[color:var(--vd-muted)] hover:bg-[color:var(--vd-surface-elevated)]",
                )}
              >
                {messages[labelKey]}
              </button>
            );
          })}
        </div>
      </div>

      {preferences.locale === "en" ? (
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-[1.05rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            {messages.enCurrencyLabel}
          </h2>
          <div
            className="mt-4 grid grid-cols-2 gap-2"
            role="radiogroup"
            aria-label={messages.enCurrencyLabel}
          >
            {CURRENCY_OPTIONS.map(({ value, labelKey }) => {
              const selected = preferences.enCurrency === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={pending}
                  onClick={() =>
                    persist({
                      locale: "en",
                      enCurrency: value,
                    })
                  }
                  className={cn(
                    "min-h-11 rounded-[var(--vd-radius-control)] border px-3 py-2.5 text-[0.82rem] font-medium transition",
                    selected
                      ? "border-[color:var(--vd-text)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)]"
                      : "border-[color:var(--vd-border)] text-[color:var(--vd-muted)] hover:bg-[color:var(--vd-surface-elevated)]",
                  )}
                >
                  {messages[labelKey]}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {pending ? (
        <p className="text-[0.78rem] text-[color:var(--vd-muted)]">{messages.saving}</p>
      ) : null}
      {saved ? (
        <p className="text-[0.78rem] text-emerald-600" role="status">
          {messages.saveSuccess}
        </p>
      ) : null}
      {error ? (
        <p className="text-[0.78rem] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
