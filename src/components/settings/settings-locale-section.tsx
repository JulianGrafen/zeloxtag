"use client";

import { useState, useTransition } from "react";
import { Globe, Palette } from "lucide-react";

import { updateAppLocaleAction } from "@/actions/update-app-locale";
import {
  IOSGroupedList,
  IOSListItem,
  IOSSheetModal,
} from "@/components/ui/ios";
import { useLocale } from "@/lib/i18n/hooks/use-locale";
import { useRegionalFormatters } from "@/lib/i18n/hooks/use-regional-formatters";
import type { AppLocale, EnCurrency } from "@/lib/i18n/types";

type LocaleSettingsVariant = "general" | "locale-only";

function LocaleSettingsContent({ variant }: { variant: LocaleSettingsVariant }) {
  const { preferences, setPreferences, messages } = useLocale();
  const regional = useRegionalFormatters();
  const [pending, startTransition] = useTransition();
  const [sheet, setSheet] = useState<"locale" | "currency" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function persist(next: { locale: AppLocale; enCurrency: EnCurrency }) {
    setError(null);
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
    });
  }

  const localeLabel =
    preferences.locale === "de"
      ? messages.languageDe
      : messages.languageEn;

  const currencyLabel =
    preferences.locale === "de"
      ? "EUR (€)"
      : preferences.enCurrency === "gbp"
        ? messages.enCurrencyGbp
        : messages.enCurrencyUsd;

  const unitsLabel = `${regional.profile.powerLabel} · ${regional.profile.distanceUnit === "km" ? "km" : "mi"} · ${regional.profile.currency}`;
  const isGeneral = variant === "general";
  const unitsIsLast = !isGeneral;

  return (
    <>
      <IOSGroupedList
        headerTitle={
          isGeneral ? "Allgemein" : messages.settingsLanguageTitle
        }
        footerText={
          error ??
          "Einheiten folgen der Sprache (DE: PS/km/€, EN: HP/mi/USD oder GBP)."
        }
      >
        <IOSListItem
          label={messages.languageLabel}
          value={localeLabel}
          icon={<Globe className="h-4 w-4" />}
          onPress={() => setSheet("locale")}
          showChevron
        />
        {preferences.locale === "en" ? (
          <IOSListItem
            label={messages.enCurrencyLabel}
            value={currencyLabel}
            onPress={() => setSheet("currency")}
            showChevron
          />
        ) : null}
        <IOSListItem
          label="Einheiten"
          sublabel="Anzeige in der App"
          value={unitsLabel}
          isLast={unitsIsLast}
        />
        {isGeneral ? (
          <IOSListItem
            label="Erscheinungsbild"
            sublabel="Hell, Dunkel oder System"
            href="/settings/appearance"
            icon={<Palette className="h-4 w-4" />}
            isLast
          />
        ) : null}
      </IOSGroupedList>

      <IOSSheetModal
        open={sheet === "locale"}
        title={messages.languageLabel}
        onClose={() => setSheet(null)}
        options={[
          {
            id: "de",
            label: messages.languageDe,
            selected: preferences.locale === "de",
          },
          {
            id: "en",
            label: messages.languageEn,
            selected: preferences.locale === "en",
          },
        ]}
        onSelectOption={(id) => {
          if (id !== "de" && id !== "en") return;
          persist({
            locale: id,
            enCurrency: preferences.enCurrency,
          });
        }}
      />

      <IOSSheetModal
        open={sheet === "currency"}
        title={messages.enCurrencyLabel}
        onClose={() => setSheet(null)}
        options={[
          {
            id: "usd",
            label: messages.enCurrencyUsd,
            selected: preferences.enCurrency === "usd",
          },
          {
            id: "gbp",
            label: messages.enCurrencyGbp,
            selected: preferences.enCurrency === "gbp",
          },
        ]}
        onSelectOption={(id) => {
          if (id !== "usd" && id !== "gbp") return;
          persist({
            locale: preferences.locale,
            enCurrency: id,
          });
        }}
      />

      {pending ? (
        <p className="px-4 text-xs text-zinc-500">Speichern…</p>
      ) : null}
    </>
  );
}

export function SettingsGeneralSection() {
  return <LocaleSettingsContent variant="general" />;
}

export function SettingsLocaleSection() {
  return <LocaleSettingsContent variant="locale-only" />;
}
