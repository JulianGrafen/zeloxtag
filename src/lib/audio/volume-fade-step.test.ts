import { describe, expect, it } from "vitest";

import { volumeFadeStep } from "@/lib/audio/volume-fade-step";

describe("volumeFadeStep", () => {
  it("ramps volume down over the fade window", () => {
    const mid = volumeFadeStep({
      startVolume: 1,
      elapsedMs: 87.5,
      fadeMs: 175,
    });
    expect(mid.done).toBe(false);
    expect(mid.volume).toBeCloseTo(0.5, 2);

    const end = volumeFadeStep({
      startVolume: 1,
      elapsedMs: 175,
      fadeMs: 175,
    });
    expect(end.done).toBe(true);
    expect(end.volume).toBe(0);
  });

  it("clamps invalid elapsed values", () => {
    const start = volumeFadeStep({
      startVolume: 0.8,
      elapsedMs: -10,
      fadeMs: 175,
    });
    expect(start.volume).toBe(0.8);
    expect(start.done).toBe(false);
  });
});
