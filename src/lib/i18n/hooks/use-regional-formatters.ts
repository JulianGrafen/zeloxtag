"use client";

import { useMemo } from "react";

import { useLocale } from "@/lib/i18n/hooks/use-locale";
import {
  formatDistanceFromKm,
  formatMoney,
  formatPowerFromPs,
  formatPowerLabel,
} from "@/lib/i18n/formatters";

export function useRegionalFormatters() {
  const { profile } = useLocale();

  return useMemo(
    () => ({
      profile,
      formatMoney: (amount: number | null | undefined) =>
        formatMoney(amount, profile),
      formatDistanceFromKm: (km: number | null | undefined) =>
        formatDistanceFromKm(km, profile),
      formatPowerFromPs: (powerPs: number | null | undefined) =>
        formatPowerFromPs(powerPs, profile),
      formatPowerLabel: () => formatPowerLabel(profile),
    }),
    [profile],
  );
}
