import { buildQuartettLines } from "@/lib/showcase/build-quartett-lines";

function parsePositiveInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function buildClaimPreviewQuartettLines(input: {
  powerPs?: string;
  displacementCc?: string;
}) {
  return buildQuartettLines({
    powerPs: parsePositiveInt(input.powerPs ?? ""),
    displacementCc: parsePositiveInt(input.displacementCc ?? ""),
    includeDisplacement: true,
    maxLines: 4,
  });
}
