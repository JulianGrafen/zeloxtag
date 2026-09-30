import { buildShowcaseSpecRows } from "@/components/public-showcase/showcase-spec-rows";
import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

import type { ShareCardSpecRow } from "./types";

function formatStatValue(
  amount: number | null | undefined,
  unit: string,
  options?: { decimals?: number },
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const formatted =
    options?.decimals != null
      ? amount.toLocaleString("de-DE", {
          minimumFractionDigits: options.decimals,
          maximumFractionDigits: options.decimals,
        })
      : amount.toLocaleString("de-DE");
  return unit ? `${formatted} ${unit}`.trim() : formatted;
}

function toValueText(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toLocaleString("de-DE");
  return String(value);
}

export function buildShareCardSpecRows(
  profile: PublicShowcaseProfile,
): ShareCardSpecRow[] {
  const showcaseRows = buildShowcaseSpecRows(profile, formatStatValue);

  return showcaseRows.map((row) => ({
    key: row.key,
    label: row.label,
    valueText: toValueText(row.value),
    layout:
      row.layout === "quartett"
        ? "quartett"
        : row.layout === "stacked"
          ? "stacked"
          : "inline",
    quartett: row.quartett,
  }));
}
