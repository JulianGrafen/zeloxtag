import { describe, expect, it } from "vitest";

import { MAX_MINT_BATCH, parseMintCount } from "@/lib/tags/mint-batch";

describe("parseMintCount", () => {
  it("accepts a batch within bounds", () => {
    expect(parseMintCount(1)).toBe(1);
    expect(parseMintCount("8")).toBe(8);
    expect(parseMintCount(MAX_MINT_BATCH)).toBe(MAX_MINT_BATCH);
  });

  it("rejects empty or oversized batches", () => {
    expect(parseMintCount(0)).toBeNull();
    expect(parseMintCount(MAX_MINT_BATCH + 1)).toBeNull();
    expect(parseMintCount("nope")).toBeNull();
  });
});
