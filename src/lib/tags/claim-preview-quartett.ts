import { buildQuartettLines } from "@/lib/showcase/build-quartett-lines";
import {
  ACCEL_0_100_SEC_MAX,
  ACCEL_0_100_SEC_MIN,
  ACCEL_100_200_SEC_MAX,
  ACCEL_100_200_SEC_MIN,
  parseAccelSecondsFromDraft,
} from "@/lib/vehicles/tech-specs";

function parsePositiveInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function buildClaimPreviewQuartettLines(input: {
  powerPs?: string;
  torqueNm?: string;
  displacementCc?: string;
  accel0To100Sec?: string;
  accel100To200Sec?: string;
}) {
  return buildQuartettLines({
    powerPs: parsePositiveInt(input.powerPs ?? ""),
    torqueNm: parsePositiveInt(input.torqueNm ?? ""),
    displacementCc: parsePositiveInt(input.displacementCc ?? ""),
    accel0To100Sec: parseAccelSecondsFromDraft(
      input.accel0To100Sec ?? "",
      ACCEL_0_100_SEC_MIN,
      ACCEL_0_100_SEC_MAX,
    ),
    accel100To200Sec: parseAccelSecondsFromDraft(
      input.accel100To200Sec ?? "",
      ACCEL_100_200_SEC_MIN,
      ACCEL_100_200_SEC_MAX,
    ),
    includeDisplacement: true,
    maxLines: 6,
  });
}
