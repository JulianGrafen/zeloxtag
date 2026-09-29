/**
 * Continuous fill ratio (0–100) for compact metric bars on the share card.
 */
export function calculateBarPercentage(
  current: number | string,
  max: number,
): number {
  const value = typeof current === "string" ? Number.parseFloat(current) : current;
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(max) || max <= 0) {
    return 0;
  }
  const ratio = Math.min(1, value / max);
  return Math.min(100, Math.max(0, ratio * 100));
}

/** For metrics where lower values are better (e.g. kg/PS). */
export function calculateBarPercentageLowerIsBetter(
  current: number,
  scaleMin: number,
  scaleMax: number,
): number {
  if (
    !Number.isFinite(current) ||
    current <= 0 ||
    !Number.isFinite(scaleMin) ||
    !Number.isFinite(scaleMax) ||
    scaleMax <= scaleMin
  ) {
    return 0;
  }
  const clamped = Math.min(scaleMax, Math.max(scaleMin, current));
  const ratio = (scaleMax - clamped) / (scaleMax - scaleMin);
  return Math.min(100, Math.max(0, ratio * 100));
}
