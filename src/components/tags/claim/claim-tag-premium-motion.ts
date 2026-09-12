/** Premium reveal + idle motion for the claim-intro GLB tag. */

export const INTRO_DURATION_S = 1.15;

const INTRO_START = {
  positionY: -0.14,
  scale: 0.86,
  rotationX: 0.12,
  rotationY: 0.08,
  rotationZ: 0,
};

const INTRO_END = {
  positionY: 0,
  scale: 1,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
};

const IDLE = {
  positionYAmplitude: 0.028,
  positionYHz: 1.1,
  rotationYAmplitude: 0.22,
  rotationYHz: 0.85,
  rotationZAmplitude: 0.02,
  rotationZHz: 0.6,
};

export type TagPremiumMotionOptions = {
  animate: boolean;
  reduceMotion: boolean;
  /** When false, skip scale/light intro — idle motion still runs if animate is true. */
  introReveal?: boolean;
};

export type TagPremiumMotion = {
  position: { x: number; y: number; z: number };
  scale: number;
  rotation: { x: number; y: number; z: number };
  phase: "static" | "intro" | "idle";
};

export type TagKeyLightMotion = {
  position: { x: number; y: number; z: number };
  intensity: number;
};

const KEY_LIGHT_REST = { x: 4, y: 6, z: 5 };
const KEY_LIGHT_INTENSITY_REST = 1.55;
const KEY_LIGHT_INTENSITY_INTRO_START = 0.6;

function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 3;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function introProgress(elapsedSeconds: number): number {
  return easeOutCubic(elapsedSeconds / INTRO_DURATION_S);
}

export function getTagPremiumMotion(
  elapsedSeconds: number,
  options: TagPremiumMotionOptions,
): TagPremiumMotion {
  if (!options.animate || options.reduceMotion) {
    return {
      position: { x: 0, y: INTRO_END.positionY, z: 0 },
      scale: INTRO_END.scale,
      rotation: {
        x: INTRO_END.rotationX,
        y: INTRO_END.rotationY,
        z: INTRO_END.rotationZ,
      },
      phase: "static",
    };
  }

  const introReveal = options.introReveal !== false;

  if (introReveal && elapsedSeconds < INTRO_DURATION_S) {
    const p = introProgress(elapsedSeconds);
    return {
      position: {
        x: 0,
        y: lerp(INTRO_START.positionY, INTRO_END.positionY, p),
        z: 0,
      },
      scale: lerp(INTRO_START.scale, INTRO_END.scale, p),
      rotation: {
        x: lerp(INTRO_START.rotationX, INTRO_END.rotationX, p),
        y: lerp(INTRO_START.rotationY, INTRO_END.rotationY, p),
        z: lerp(INTRO_START.rotationZ, INTRO_END.rotationZ, p),
      },
      phase: "intro",
    };
  }

  const idleT = introReveal
    ? elapsedSeconds - INTRO_DURATION_S
    : elapsedSeconds;
  return {
    position: {
      x: 0,
      y: Math.sin(idleT * IDLE.positionYHz) * IDLE.positionYAmplitude,
      z: 0,
    },
    scale: INTRO_END.scale,
    rotation: {
      x: INTRO_END.rotationX,
      y: Math.sin(idleT * IDLE.rotationYHz) * IDLE.rotationYAmplitude,
      z: Math.sin(idleT * IDLE.rotationZHz) * IDLE.rotationZAmplitude,
    },
    phase: "idle",
  };
}

/** Slow orbit for specular sweep on brushed metal (CSP-safe, no HDR). */
export function getTagKeyLightMotion(
  elapsedSeconds: number,
  options: TagPremiumMotionOptions,
): TagKeyLightMotion {
  if (!options.animate || options.reduceMotion) {
    return {
      position: KEY_LIGHT_REST,
      intensity: KEY_LIGHT_INTENSITY_REST,
    };
  }

  const introReveal = options.introReveal !== false;
  let intensity = KEY_LIGHT_INTENSITY_REST;
  if (introReveal && elapsedSeconds < INTRO_DURATION_S) {
    const p = introProgress(elapsedSeconds);
    intensity = lerp(KEY_LIGHT_INTENSITY_INTRO_START, KEY_LIGHT_INTENSITY_REST, p);
  }

  const sweepT = introReveal
    ? Math.max(0, elapsedSeconds - INTRO_DURATION_S * 0.35)
    : elapsedSeconds;
  const angle = sweepT * 0.42;
  const radius = 1.15;

  return {
    position: {
      x: KEY_LIGHT_REST.x + Math.cos(angle) * radius,
      y: KEY_LIGHT_REST.y + Math.sin(angle * 0.55) * 0.35,
      z: KEY_LIGHT_REST.z + Math.sin(angle) * radius * 0.65,
    },
    intensity,
  };
}
