export const SHOWCASE_QUARTETT_SEGMENT_COUNT = 10;

/** Category ceiling for power bars (classic Quartett-style scale). */
export const SHOWCASE_QUARTETT_POWER_PS_MAX = 1000;

/** Category ceiling for torque bars. */
export const SHOWCASE_QUARTETT_TORQUE_NM_MAX = 1200;

/** 0–100 km/h: at or below = full bar; at or above = empty. */
export const SHOWCASE_QUARTETT_ACCEL_0_100_MIN_SEC = 2.5;
export const SHOWCASE_QUARTETT_ACCEL_0_100_MAX_SEC = 15;

/** 100–200 km/h: at or below = full bar; at or above = empty. */
export const SHOWCASE_QUARTETT_ACCEL_100_200_MIN_SEC = 5;
export const SHOWCASE_QUARTETT_ACCEL_100_200_MAX_SEC = 30;

/**
 * How many segments to fill. Uses round so mid-range values feel fair on cards;
 * clamped so 0 < value ≤ max never exceeds segment count.
 */
export function filledSegments(
  amount: number,
  scaleMax: number,
  segmentCount = SHOWCASE_QUARTETT_SEGMENT_COUNT,
): number {
  if (!Number.isFinite(amount) || amount <= 0 || scaleMax <= 0) {
    return 0;
  }
  const ratio = Math.min(1, amount / scaleMax);
  return Math.min(
    segmentCount,
    Math.max(0, Math.round(ratio * segmentCount)),
  );
}

/** Faster times fill more segments (inverse of higher-is-better). */
export function filledSegmentsLowerIsBetter(
  seconds: number,
  scaleMin: number,
  scaleMax: number,
  segmentCount = SHOWCASE_QUARTETT_SEGMENT_COUNT,
): number {
  if (!Number.isFinite(seconds) || seconds <= 0 || scaleMax <= scaleMin) {
    return 0;
  }
  const clamped = Math.min(scaleMax, Math.max(scaleMin, seconds));
  const ratio = (scaleMax - clamped) / (scaleMax - scaleMin);
  return Math.min(
    segmentCount,
    Math.max(0, Math.round(ratio * segmentCount)),
  );
}
