import { describe, expect, it } from "vitest";

import {
  estimateMp3DurationSeconds,
  readWavDurationSeconds,
} from "@/lib/vehicles/engine-sound-duration";

describe("engine sound duration", () => {
  it("reads PCM WAV duration from header", () => {
    const bytes = new Uint8Array(44 + 1000);
    const view = new DataView(bytes.buffer);
    bytes.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    bytes.set([0x57, 0x41, 0x56, 0x45], 8); // WAVE
    bytes.set([0x66, 0x6d, 0x74, 0x20], 12); // fmt
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 44100, true);
    view.setUint32(28, 88200, true); // byte rate
    bytes.set([0x64, 0x61, 0x74, 0x61], 36); // data
    view.setUint32(40, 1000, true);

    const duration = readWavDurationSeconds(bytes);
    expect(duration).toBeCloseTo(1000 / 88200, 4);
  });

  it("estimates MP3 duration from ID3 + frame header", () => {
    const bytes = new Uint8Array(128_000);
    bytes.set([0x49, 0x44, 0x33], 0); // ID3
    bytes[6] = 0;
    bytes[7] = 0;
    bytes[8] = 0;
    bytes[9] = 0;
    const offset = 10;
    bytes[offset] = 0xff;
    bytes[offset + 1] = 0xfb; // MPEG1 Layer III
    bytes[offset + 2] = 0x90; // 128kbps @ 44.1kHz

    const duration = estimateMp3DurationSeconds(bytes);
    expect(duration).not.toBeNull();
    expect(duration!).toBeGreaterThan(0);
    expect(duration!).toBeLessThan(15);
  });
});
