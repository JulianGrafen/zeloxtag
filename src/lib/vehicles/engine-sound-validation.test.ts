import { describe, expect, it } from "vitest";

import {
  ENGINE_SOUND_MAX_BYTES,
  ENGINE_SOUND_MAX_SECONDS,
} from "@/lib/vehicles/engine-sound-constants";
import { validateEngineSoundMeta } from "@/lib/vehicles/engine-sound-validation";

describe("validateEngineSoundMeta", () => {
  it("accepts mp3 within limits", () => {
    const result = validateEngineSoundMeta(
      "audio/mpeg",
      "start.mp3",
      512_000,
      8,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.extension).toBe("mp3");
    }
  });

  it("rejects oversize files", () => {
    const result = validateEngineSoundMeta(
      "audio/mpeg",
      "start.mp3",
      ENGINE_SOUND_MAX_BYTES + 1,
      5,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects audio longer than 10 seconds", () => {
    const result = validateEngineSoundMeta(
      "audio/mp4",
      "rev.m4a",
      100_000,
      ENGINE_SOUND_MAX_SECONDS + 0.5,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects unsupported extensions", () => {
    const result = validateEngineSoundMeta(
      "audio/wav",
      "engine.wav",
      100_000,
      3,
    );
    expect(result.ok).toBe(false);
  });
});
