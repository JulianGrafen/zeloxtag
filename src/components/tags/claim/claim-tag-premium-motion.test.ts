import { describe, expect, it } from "vitest";

import {
  getTagKeyLightMotion,
  getTagPremiumMotion,
  INTRO_DURATION_S,
} from "./claim-tag-premium-motion";

describe("getTagPremiumMotion", () => {
  it("starts intro at lowered scale and position", () => {
    const m = getTagPremiumMotion(0, { animate: true, reduceMotion: false });
    expect(m.phase).toBe("intro");
    expect(m.scale).toBeCloseTo(0.86);
    expect(m.position.y).toBeCloseTo(-0.14);
    expect(m.rotation.x).toBeGreaterThan(0);
  });

  it("reaches end pose after intro duration", () => {
    const m = getTagPremiumMotion(INTRO_DURATION_S, {
      animate: true,
      reduceMotion: false,
    });
    expect(m.scale).toBe(1);
    expect(m.position.y).toBeCloseTo(0, 5);
    expect(m.rotation.x).toBeCloseTo(0, 5);
    expect(m.rotation.y).toBeCloseTo(0, 5);
  });

  it("idle oscillates within bounds", () => {
    const m = getTagPremiumMotion(INTRO_DURATION_S + 2.5, {
      animate: true,
      reduceMotion: false,
    });
    expect(m.phase).toBe("idle");
    expect(Math.abs(m.position.y)).toBeLessThanOrEqual(0.029);
    expect(Math.abs(m.rotation.y)).toBeLessThanOrEqual(0.23);
    expect(Math.abs(m.rotation.z)).toBeLessThanOrEqual(0.021);
  });

  it("reduceMotion returns static end pose", () => {
    const m = getTagPremiumMotion(5, { animate: true, reduceMotion: true });
    expect(m.phase).toBe("static");
    expect(m.scale).toBe(1);
    expect(m.position.y).toBe(0);
    expect(m.rotation.y).toBe(0);
  });

  it("introReveal false skips intro and starts idle at t=0", () => {
    const m = getTagPremiumMotion(0, {
      animate: true,
      reduceMotion: false,
      introReveal: false,
    });
    expect(m.phase).toBe("idle");
    expect(m.scale).toBe(1);
    expect(m.position.y).toBeCloseTo(0, 5);
  });
});

describe("getTagKeyLightMotion", () => {
  it("ramps intensity during intro", () => {
    const start = getTagKeyLightMotion(0, { animate: true, reduceMotion: false });
    const end = getTagKeyLightMotion(INTRO_DURATION_S, {
      animate: true,
      reduceMotion: false,
    });
    expect(start.intensity).toBeLessThan(end.intensity);
    expect(end.intensity).toBeCloseTo(1.55);
  });

  it("reduceMotion uses fixed rest light", () => {
    const m = getTagKeyLightMotion(10, { animate: true, reduceMotion: true });
    expect(m.position).toEqual({ x: 4, y: 6, z: 5 });
    expect(m.intensity).toBeCloseTo(1.55);
  });

  it("introReveal false uses full intensity immediately", () => {
    const m = getTagKeyLightMotion(0, {
      animate: true,
      reduceMotion: false,
      introReveal: false,
    });
    expect(m.intensity).toBeCloseTo(1.55);
  });
});
