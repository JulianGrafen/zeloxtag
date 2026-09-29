import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";
import { formatPublicVehicleTitle } from "@/lib/vehicles/format-public-vehicle-title";

import {
  SHAREABLE_SPEC_POWER_MAX_PS,
  SHAREABLE_SPEC_POWER_TO_WEIGHT_MAX_KG_PS,
  SHAREABLE_SPEC_POWER_TO_WEIGHT_MIN_KG_PS,
  SHAREABLE_SPEC_TORQUE_MAX_NM,
} from "./constants";
import { formatSpecDelta } from "./format-spec-delta";
import { formatV4aTagDisplayId } from "./format-v4a-tag-display-id";
import type { ShareableBuildData, VehicleSpecMetric } from "./types";

export type BuildShareableBuildDataInput = {
  profile: PublicShowcaseProfile;
  modificationsCount: number;
  tagUuid?: string;
  stageInfo?: string;
  stockPowerPs?: number;
  stockTorqueNm?: number;
  curbWeightKg?: number;
};

function resolveStageInfo(
  explicit: string | undefined,
  profile: PublicShowcaseProfile,
): string {
  if (explicit?.trim()) return explicit.trim();
  if (profile.dynoChartUrl) return "Dyno Verified";
  if (profile.buildPersonalityLabels[0]) {
    return profile.buildPersonalityLabels[0];
  }
  return "Verified Build";
}

function buildPowerMetric(
  powerPs: number,
  stockPowerPs?: number,
): VehicleSpecMetric {
  return {
    label: "Leistung",
    value: Math.round(powerPs),
    unit: "PS",
    stockValue: stockPowerPs,
    maxValue: SHAREABLE_SPEC_POWER_MAX_PS,
    delta: formatSpecDelta(powerPs, stockPowerPs, "PS"),
  };
}

function buildTorqueMetric(
  torqueNm: number,
  stockTorqueNm?: number,
): VehicleSpecMetric {
  return {
    label: "Drehmoment",
    value: Math.round(torqueNm),
    unit: "Nm",
    stockValue: stockTorqueNm,
    maxValue: SHAREABLE_SPEC_TORQUE_MAX_NM,
    delta: formatSpecDelta(torqueNm, stockTorqueNm, "Nm"),
  };
}

function buildPowerToWeightMetric(
  powerPs: number,
  curbWeightKg: number | undefined,
): VehicleSpecMetric {
  const kgPs =
    curbWeightKg != null && curbWeightKg > 0 && powerPs > 0
      ? curbWeightKg / powerPs
      : "—";

  return {
    label: "kg / PS",
    value: typeof kgPs === "number" ? kgPs.toFixed(1) : kgPs,
    unit: typeof kgPs === "number" ? "" : "",
    maxValue: SHAREABLE_SPEC_POWER_TO_WEIGHT_MAX_KG_PS,
    stockValue: SHAREABLE_SPEC_POWER_TO_WEIGHT_MIN_KG_PS,
  };
}

export function buildShareableBuildData(
  input: BuildShareableBuildDataInput,
): ShareableBuildData | null {
  const { profile } = input;
  const powerPs = profile.powerPs;
  const torqueNm = profile.torqueNm;

  if (powerPs == null || torqueNm == null) {
    return null;
  }

  const title = formatPublicVehicleTitle(profile.make, profile.model);
  const modelName =
    profile.year != null && title ? `${title} · ${profile.year}` : title || "Fahrzeug";

  return {
    modelName,
    stageInfo: resolveStageInfo(input.stageInfo, profile),
    imageUrl: profile.heroImageSrc ?? undefined,
    metrics: {
      power: buildPowerMetric(powerPs, input.stockPowerPs),
      torque: buildTorqueMetric(torqueNm, input.stockTorqueNm),
      powerToWeight: buildPowerToWeightMetric(powerPs, input.curbWeightKg),
      modsCount: Math.max(0, input.modificationsCount),
    },
    v4aTagId: formatV4aTagDisplayId(input.tagUuid),
  };
}
