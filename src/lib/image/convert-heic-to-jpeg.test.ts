import { describe, expect, it } from "vitest";

import {
  isHeicMime,
  normalizeHeicUploadBytes,
  sniffHeicMimeFromBytes,
} from "./convert-heic-to-jpeg";

describe("convert-heic-to-jpeg", () => {
  it("detects HEIC MIME types", () => {
    expect(isHeicMime("image/heic")).toBe(true);
    expect(isHeicMime("image/heif")).toBe(true);
    expect(isHeicMime("image/jpeg")).toBe(false);
  });

  it("sniffs HEIC brand from ISO BMFF header", () => {
    const heic = Buffer.alloc(16);
    heic.write("????ftypheic", 0, "ascii");
    expect(sniffHeicMimeFromBytes(heic)).toBe("image/heic");

    const heif = Buffer.alloc(16);
    heif.write("????ftypmif1", 0, "ascii");
    expect(sniffHeicMimeFromBytes(heif)).toBe("image/heif");
  });

  it("passes through non-HEIC bytes unchanged", async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    const result = await normalizeHeicUploadBytes(jpeg, "image/jpeg");
    expect(result.mime).toBe("image/jpeg");
    expect(result.bytes).toBe(jpeg);
  });
});
