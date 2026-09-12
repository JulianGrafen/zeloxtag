import type { ReactNode } from "react";

import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

import { buildShowcaseTechnicalFields } from "./showcase-technical-fields";
import {
  SHOWCASE_QUARTETT_ACCEL_0_100_MAX_SEC,
  SHOWCASE_QUARTETT_ACCEL_0_100_MIN_SEC,
  SHOWCASE_QUARTETT_ACCEL_100_200_MAX_SEC,
  SHOWCASE_QUARTETT_ACCEL_100_200_MIN_SEC,
  SHOWCASE_QUARTETT_POWER_PS_MAX,
  SHOWCASE_QUARTETT_TORQUE_NM_MAX,
} from "./showcase-quartett-scales";

export type ShowcaseQuartettMeta = {
  amount: number;
  unit: string;
  scaleMax: number;
  scaleMin?: number;
  polarity?: "higher" | "lower";
};

export type ShowcaseSpecRow = {
  key: string;
  label: string;
  value: ReactNode;
  emphasis?: boolean;
  /** Multiline text (e.g. Spezifikation) — label above value. */
  layout?: "stacked" | "quartett";
  quartett?: ShowcaseQuartettMeta;
};

function formatEngine(profile: PublicShowcaseProfile): string | null {
  if (profile.engine) return profile.engine;
  if (profile.displacementCc != null) {
    const liters = (profile.displacementCc / 1000).toFixed(1);
    return `${liters} L`;
  }
  return null;
}

function formatDrivetrain(profile: PublicShowcaseProfile): string | null {
  const parts = [profile.drivetrain, profile.transmission].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function buildShowcaseSpecRows(
  profile: PublicShowcaseProfile,
  renderAnimatedStat: (
    amount: number | null | undefined,
    unit: string,
    options?: { decimals?: number },
  ) => ReactNode,
): ShowcaseSpecRow[] {
  const rows: ShowcaseSpecRow[] = [];

  if (profile.powerPs != null) {
    rows.push({
      key: "power",
      label: "Leistung",
      value: renderAnimatedStat(profile.powerPs, "PS"),
      emphasis: true,
      layout: "quartett",
      quartett: {
        amount: profile.powerPs,
        unit: "PS",
        scaleMax: SHOWCASE_QUARTETT_POWER_PS_MAX,
        polarity: "higher",
      },
    });
  }
  if (profile.torqueNm != null) {
    rows.push({
      key: "torque",
      label: "Drehmoment",
      value: renderAnimatedStat(profile.torqueNm, "Nm"),
      emphasis: true,
      layout: "quartett",
      quartett: {
        amount: profile.torqueNm,
        unit: "Nm",
        scaleMax: SHOWCASE_QUARTETT_TORQUE_NM_MAX,
        polarity: "higher",
      },
    });
  }

  if (profile.accel0To100Sec != null) {
    rows.push({
      key: "accel0To100",
      label: "0–100",
      value: renderAnimatedStat(profile.accel0To100Sec, "s", { decimals: 1 }),
      emphasis: true,
      layout: "quartett",
      quartett: {
        amount: profile.accel0To100Sec,
        unit: "s",
        scaleMin: SHOWCASE_QUARTETT_ACCEL_0_100_MIN_SEC,
        scaleMax: SHOWCASE_QUARTETT_ACCEL_0_100_MAX_SEC,
        polarity: "lower",
      },
    });
  }

  if (profile.accel100To200Sec != null) {
    rows.push({
      key: "accel100To200",
      label: "100–200",
      value: renderAnimatedStat(profile.accel100To200Sec, "s", { decimals: 1 }),
      emphasis: true,
      layout: "quartett",
      quartett: {
        amount: profile.accel100To200Sec,
        unit: "s",
        scaleMin: SHOWCASE_QUARTETT_ACCEL_100_200_MIN_SEC,
        scaleMax: SHOWCASE_QUARTETT_ACCEL_100_200_MAX_SEC,
        polarity: "lower",
      },
    });
  }

  const engine = formatEngine(profile);
  if (engine) {
    rows.push({ key: "engine", label: "Motor", value: engine });
  }

  const drive = formatDrivetrain(profile);
  if (drive) {
    rows.push({ key: "drivetrain", label: "Antrieb", value: drive });
  }

  for (const field of buildShowcaseTechnicalFields(profile)) {
    rows.push({
      key: field.key,
      label: field.label,
      value: field.value,
    });
  }

  const specification = profile.notes?.trim();
  if (specification) {
    rows.push({
      key: "specification",
      label: "Spezifikation",
      value: specification,
      layout: "stacked",
    });
  }

  return rows;
}
