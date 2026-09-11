import type { ReactNode } from "react";

import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

import { buildShowcaseTechnicalFields } from "./showcase-technical-fields";

export type ShowcaseSpecRow = {
  key: string;
  label: string;
  value: ReactNode;
  emphasis?: boolean;
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
  ) => ReactNode,
): ShowcaseSpecRow[] {
  const rows: ShowcaseSpecRow[] = [];

  if (profile.powerPs != null) {
    rows.push({
      key: "power",
      label: "Leistung",
      value: renderAnimatedStat(profile.powerPs, "PS"),
      emphasis: true,
    });
  }
  if (profile.torqueNm != null) {
    rows.push({
      key: "torque",
      label: "Drehmoment",
      value: renderAnimatedStat(profile.torqueNm, "Nm"),
      emphasis: true,
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

  return rows;
}
