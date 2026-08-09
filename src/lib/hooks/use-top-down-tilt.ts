"use client";

import { useEffect, useState } from "react";

/** Max tilt (°) from perfectly overhead before the level indicator turns green. */
export const TOP_DOWN_LEVEL_TOLERANCE_DEG = 12;

export type TopDownTiltState = {
  /** True once we receive at least one orientation/motion sample. */
  active: boolean;
  /** Whether motion/orientation APIs exist in this browser. */
  supported: boolean;
  /** iOS 13+ requires an explicit permission prompt before events fire. */
  needsPermission: boolean;
  /** User denied or permission request failed. */
  permissionDenied: boolean;
  /** Tilt from straight-down in degrees (0 = camera points perpendicular at document). */
  tiltDeg: number | null;
  /** Left/right roll in degrees (0 = level). */
  rollDeg: number | null;
  /** Within tolerance for a parallel overhead shot. */
  isLevel: boolean;
};

const INITIAL: TopDownTiltState = {
  active: false,
  supported: false,
  needsPermission: false,
  permissionDenied: false,
  tiltDeg: null,
  rollDeg: null,
  isLevel: false,
};

export function computeTiltFromBetaGamma(
  beta: number | null,
  gamma: number | null,
): Pick<TopDownTiltState, "tiltDeg" | "rollDeg" | "isLevel"> {
  if (beta == null || gamma == null || !Number.isFinite(beta) || !Number.isFinite(gamma)) {
    return { tiltDeg: null, rollDeg: null, isLevel: false };
  }

  // 0° / 180° = phone horizontal (parallel to a flat document on the table).
  const absBeta = Math.abs(beta);
  const tiltFromHorizontal = Math.min(absBeta, Math.abs(180 - absBeta));
  const roll = Math.abs(gamma);
  const tilt = Math.sqrt(tiltFromHorizontal ** 2 + roll ** 2);

  return {
    tiltDeg: Math.round(tilt * 10) / 10,
    rollDeg: Math.round(roll * 10) / 10,
    isLevel: tilt <= TOP_DOWN_LEVEL_TOLERANCE_DEG,
  };
}

export function computeTiltFromGravity(
  x: number,
  y: number,
  z: number,
): Pick<TopDownTiltState, "tiltDeg" | "rollDeg" | "isLevel"> {
  const magnitude = Math.hypot(x, y, z);
  if (magnitude < 4) {
    return { tiltDeg: null, rollDeg: null, isLevel: false };
  }

  // Gravity component in the phone screen plane → 0 when held parallel to the table.
  const inPlaneRatio = Math.hypot(x, y) / magnitude;
  const tiltFromHorizontal =
    Math.asin(Math.min(1, inPlaneRatio)) * (180 / Math.PI);

  // Roll for the bubble UI when the phone is roughly flat (gravity mostly on Z).
  const rollDeg =
    Math.abs(z) > 4
      ? Math.abs((Math.atan2(x, z) * 180) / Math.PI)
      : 0;
  const normalizedRoll = rollDeg > 90 ? 180 - rollDeg : rollDeg;

  return {
    tiltDeg: Math.round(tiltFromHorizontal * 10) / 10,
    rollDeg: Math.round(normalizedRoll * 10) / 10,
    isLevel:
      tiltFromHorizontal <= TOP_DOWN_LEVEL_TOLERANCE_DEG &&
      normalizedRoll <= TOP_DOWN_LEVEL_TOLERANCE_DEG,
  };
}

function iosNeedsOrientationPermission(): boolean {
  if (typeof window === "undefined") return false;
  const requestPermission = (
    DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    }
  ).requestPermission;
  return typeof requestPermission === "function";
}

/**
 * Tracks how parallel the device is to a flat document beneath the camera.
 * Uses DeviceOrientation (preferred) with DeviceMotion gravity fallback.
 */
export function useTopDownTilt(enabled: boolean): TopDownTiltState & {
  requestPermission: () => Promise<boolean>;
} {
  const [state, setState] = useState<TopDownTiltState>(() => ({
    ...INITIAL,
    supported:
      typeof window !== "undefined" &&
      ("DeviceOrientationEvent" in window || "DeviceMotionEvent" in window),
    needsPermission: iosNeedsOrientationPermission(),
  }));

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const hasOrientation = "DeviceOrientationEvent" in window;
    const hasMotion = "DeviceMotionEvent" in window;

    if (!hasOrientation && !hasMotion) {
      setState((prev) => ({ ...prev, supported: false }));
      return;
    }

    setState((prev) => ({
      ...prev,
      supported: true,
      needsPermission: iosNeedsOrientationPermission(),
    }));

    function applyOrientation(event: DeviceOrientationEvent) {
      const next = computeTiltFromBetaGamma(event.beta, event.gamma);
      setState((prev) => ({
        ...prev,
        active: true,
        permissionDenied: false,
        ...next,
      }));
    }

    function applyMotion(event: DeviceMotionEvent) {
      const g = event.accelerationIncludingGravity;
      if (!g || g.x == null || g.y == null || g.z == null) return;
      const next = computeTiltFromGravity(g.x, g.y, g.z);
      setState((prev) => ({
        ...prev,
        active: true,
        permissionDenied: false,
        ...next,
      }));
    }

    if (hasOrientation) {
      window.addEventListener("deviceorientation", applyOrientation, true);
    }
    if (hasMotion) {
      window.addEventListener("devicemotion", applyMotion, true);
    }

    return () => {
      if (hasOrientation) {
        window.removeEventListener("deviceorientation", applyOrientation, true);
      }
      if (hasMotion) {
        window.removeEventListener("devicemotion", applyMotion, true);
      }
    };
  }, [enabled]);

  async function requestPermission(): Promise<boolean> {
    if (!iosNeedsOrientationPermission()) return true;

    try {
      const requestPermission = (
        DeviceOrientationEvent as unknown as {
          requestPermission: () => Promise<PermissionState>;
        }
      ).requestPermission;
      const result = await requestPermission();
      const granted = result === "granted";
      setState((prev) => ({
        ...prev,
        permissionDenied: !granted,
        needsPermission: !granted,
      }));
      return granted;
    } catch {
      setState((prev) => ({ ...prev, permissionDenied: true, needsPermission: true }));
      return false;
    }
  }

  return { ...state, requestPermission };
}
