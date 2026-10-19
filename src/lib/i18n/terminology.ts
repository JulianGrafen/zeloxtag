import type { AppLocale } from "@/lib/i18n/types";

export type TermKey =
  | "vaultFeature"
  | "vaultHeadline"
  | "receipts"
  | "documentDateEmpty"
  | "powerSpec"
  | "paywallScanVault"
  | "proVaultBenefit";

const TERMS: Record<TermKey, Record<AppLocale, string>> = {
  vaultFeature: {
    de: "TÜV- & Gutachten-Tresor",
    en: "Dyno Sheets & Mod Receipts",
  },
  vaultHeadline: {
    de: "TÜV- & Gutachten-Tresor",
    en: "Dyno Sheets & Mod Receipts",
  },
  receipts: {
    de: "Belege",
    en: "Mod receipts",
  },
  documentDateEmpty: {
    de: "Ohne Datum",
    en: "No date",
  },
  powerSpec: {
    de: "Leistung",
    en: "Power",
  },
  paywallScanVault: {
    de: "Rechnungen, ABEs und TÜV per KI scannen und in der Cloud speichern mit ZeloxTag Pro. Einsehen und manuelle Einträge bleiben kostenlos.",
    en: "Scan mod receipts, compliance docs, and dyno sheets with AI and store them in the cloud with ZeloxTag Pro. Viewing and manual entries stay free.",
  },
  proVaultBenefit: {
    de: "TÜV- & Gutachten-Tresor: Alle ABEs und Teilegutachten sofort griffbereit.",
    en: "Dyno sheets & mod receipts vault: compliance docs ready when you need them.",
  },
};

export function getTerm(key: TermKey, locale: AppLocale): string {
  return TERMS[key][locale];
}
