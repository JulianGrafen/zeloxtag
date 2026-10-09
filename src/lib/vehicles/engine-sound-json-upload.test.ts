import { describe, expect, it } from "vitest";

import {
  base64ToBytes,
  bytesToBase64,
} from "@/lib/vehicles/engine-sound-json-upload";

describe("bytesToBase64", () => {
  it("round-trips large payloads without spread stack overflow", () => {
    const bytes = new Uint8Array(120_000);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = i % 256;
    }
    const encoded = bytesToBase64(bytes);
    expect(base64ToBytes(encoded)).toEqual(bytes);
  });
});
