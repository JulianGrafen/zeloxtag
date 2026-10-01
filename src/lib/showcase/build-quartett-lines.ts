import {
  filledSegments,
  filledSegmentsLowerIsBetter,
  SHOWCASE_QUARTETT_ACCEL_0_100_MAX_SEC,
  SHOWCASE_QUARTETT_ACCEL_0_100_MIN_SEC,
  SHOWCASE_QUARTETT_ACCEL_100_200_MAX_SEC,
  SHOWCASE_QUARTETT_ACCEL_100_200_MIN_SEC,
  SHOWCASE_QUARTETT_DISPLACEMENT_CC_MAX,
  SHOWCASE_QUARTETT_POWER_PS_MAX,
  SHOWCASE_QUARTETT_TORQUE_NM_MAX,
} from "@/components/public-showcase/showcase-quartett-scales";

export type QuartettLineSpec = {
  key: string;
  label: string;
  value: string;
  filled: number;
};

export type BuildQuartettLinesInput = {
  powerPs?: number | null;
  torqueNm?: number | null;
  displacementCc?: number | null;
  accel0To100Sec?: number | null;
  accel100To200Sec?: number | null;
  /** Include hubraum bar (claim preview); public swipe cards omit this. */
  includeDisplacement?: boolean;
  maxLines?: number;
};

export function buildQuartettLines(
  input: BuildQuartettLinesInput,
): QuartettLineSpec[] {
  const lines: QuartettLineSpec[] = [];
  const maxLines = input.maxLines ?? 4;

  if (input.powerPs != null && input.powerPs > 0) {
    lines.push({
      key: "power",
      label: "Leistung",
      value: `${Math.round(input.powerPs)} PS`,
      filled: filledSegments(input.powerPs, SHOWCASE_QUARTETT_POWER_PS_MAX),
    });
  }

  if (input.torqueNm != null && input.torqueNm > 0) {
    lines.push({
      key: "torque",
      label: "Drehmoment",
      value: `${Math.round(input.torqueNm)} Nm`,
      filled: filledSegments(input.torqueNm, SHOWCASE_QUARTETT_TORQUE_NM_MAX),
    });
  }

  if (
    input.includeDisplacement &&
    input.displacementCc != null &&
    input.displacementCc > 0
  ) {
    lines.push({
      key: "displacement",
      label: "Hubraum",
      value: `${input.displacementCc.toLocaleString("de-DE")} ccm`,
      filled: filledSegments(
        input.displacementCc,
        SHOWCASE_QUARTETT_DISPLACEMENT_CC_MAX,
      ),
    });
  }

  if (input.accel0To100Sec != null && input.accel0To100Sec > 0) {
    lines.push({
      key: "accel0To100",
      label: "0–100",
      value: `${input.accel0To100Sec.toFixed(1)} s`,
      filled: filledSegmentsLowerIsBetter(
        input.accel0To100Sec,
        SHOWCASE_QUARTETT_ACCEL_0_100_MIN_SEC,
        SHOWCASE_QUARTETT_ACCEL_0_100_MAX_SEC,
      ),
    });
  }

  if (input.accel100To200Sec != null && input.accel100To200Sec > 0) {
    lines.push({
      key: "accel100To200",
      label: "100–200",
      value: `${input.accel100To200Sec.toFixed(1)} s`,
      filled: filledSegmentsLowerIsBetter(
        input.accel100To200Sec,
        SHOWCASE_QUARTETT_ACCEL_100_200_MIN_SEC,
        SHOWCASE_QUARTETT_ACCEL_100_200_MAX_SEC,
      ),
    });
  }

  return lines.slice(0, maxLines);
}
