"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ShinePosition = {
  x: number;
  y: number;
};

const INITIAL: ShinePosition = { x: 50, y: 50 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

export function computeShinePositionFromOrientation(
  beta: number | null,
  gamma: number | null,
  baseline: { beta: number; gamma: number } | null,
): ShinePosition | null {
  if (
    beta == null ||
    gamma == null ||
    !Number.isFinite(beta) ||
    !Number.isFinite(gamma)
  ) {
    return null;
  }

  const refBeta = baseline?.beta ?? beta;
  const refGamma = baseline?.gamma ?? gamma;
  const deltaGamma = gamma - refGamma;
  const deltaBeta = beta - refBeta;

  return {
    x: clamp(50 + deltaGamma * 2.8, 8, 92),
    y: clamp(50 + deltaBeta * 2.8, 8, 92),
  };
}

export function computeShinePositionFromGravity(
  x: number,
  y: number,
  z: number,
  baseline: { x: number; y: number; z: number } | null,
): ShinePosition | null {
  const magnitude = Math.hypot(x, y, z);
  if (magnitude < 4) return null;

  const nx = x / magnitude;
  const ny = y / magnitude;
  const ref = baseline ?? { x: nx, y: ny, z: z / magnitude };
  const deltaX = nx - ref.x;
  const deltaY = ny - ref.y;

  return {
    x: clamp(50 + deltaX * 220, 8, 92),
    y: clamp(50 + deltaY * 220, 8, 92),
  };
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Maps device tilt to a 0–100 shine hotspot for card overlays.
 * Uses sensors only when available without a permission prompt; otherwise ambient sweep.
 */
export function useDeviceMotionShine(enabled: boolean): {
  position: ShinePosition;
  motionActive: boolean;
} {
  const [position, setPosition] = useState<ShinePosition>(INITIAL);
  const [motionActive, setMotionActive] = useState(false);
  const targetRef = useRef<ShinePosition>(INITIAL);
  const currentRef = useRef<ShinePosition>(INITIAL);
  const motionActiveRef = useRef(false);
  const orientationBaselineRef = useRef<{ beta: number; gamma: number } | null>(
    null,
  );
  const gravityBaselineRef = useRef<{ x: number; y: number; z: number } | null>(
    null,
  );
  const rafRef = useRef<number | null>(null);
  const fallbackPhaseRef = useRef(0);

  const smoothToTarget = useCallback(() => {
    const current = currentRef.current;
    const target = targetRef.current;
    const next = {
      x: current.x + (target.x - current.x) * 0.14,
      y: current.y + (target.y - current.y) * 0.14,
    };
    currentRef.current = next;
    setPosition(next);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (prefersReducedMotion()) return;

    const sensorsNeedPermission = iosNeedsOrientationPermission();
    const hasOrientation =
      !sensorsNeedPermission && "DeviceOrientationEvent" in window;
    const hasMotion = !sensorsNeedPermission && "DeviceMotionEvent" in window;

    function markMotionActive() {
      if (motionActiveRef.current) return;
      motionActiveRef.current = true;
      setMotionActive(true);
    }

    function applyOrientation(event: DeviceOrientationEvent) {
      if (
        orientationBaselineRef.current == null &&
        event.beta != null &&
        event.gamma != null
      ) {
        orientationBaselineRef.current = { beta: event.beta, gamma: event.gamma };
      }
      const next = computeShinePositionFromOrientation(
        event.beta,
        event.gamma,
        orientationBaselineRef.current,
      );
      if (!next) return;
      targetRef.current = next;
      markMotionActive();
    }

    function applyDeviceMotion(event: DeviceMotionEvent) {
      const g = event.accelerationIncludingGravity;
      if (!g || g.x == null || g.y == null || g.z == null) return;

      if (gravityBaselineRef.current == null) {
        const magnitude = Math.hypot(g.x, g.y, g.z);
        if (magnitude < 4) return;
        gravityBaselineRef.current = {
          x: g.x / magnitude,
          y: g.y / magnitude,
          z: g.z / magnitude,
        };
      }

      const next = computeShinePositionFromGravity(
        g.x,
        g.y,
        g.z,
        gravityBaselineRef.current,
      );
      if (!next) return;
      targetRef.current = next;
      markMotionActive();
    }

    if (hasOrientation) {
      window.addEventListener("deviceorientation", applyOrientation, true);
    }
    if (hasMotion) {
      window.addEventListener("devicemotion", applyDeviceMotion, true);
    }

    function tick() {
      if (motionActiveRef.current) {
        smoothToTarget();
      } else {
        fallbackPhaseRef.current += 0.018;
        const phase = fallbackPhaseRef.current;
        targetRef.current = {
          x: 50 + Math.sin(phase * 1.1) * 34,
          y: 50 + Math.cos(phase * 0.85) * 26,
        };
        smoothToTarget();
      }
      rafRef.current = window.requestAnimationFrame(tick);
    }

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (hasOrientation) {
        window.removeEventListener("deviceorientation", applyOrientation, true);
      }
      if (hasMotion) {
        window.removeEventListener("devicemotion", applyDeviceMotion, true);
      }
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      motionActiveRef.current = false;
      orientationBaselineRef.current = null;
      gravityBaselineRef.current = null;
      targetRef.current = INITIAL;
      currentRef.current = INITIAL;
      setMotionActive(false);
      setPosition(INITIAL);
    };
  }, [enabled, smoothToTarget]);

  return { position, motionActive };
}
