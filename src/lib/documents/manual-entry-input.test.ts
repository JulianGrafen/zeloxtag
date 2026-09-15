import { describe, expect, it } from "vitest";

import {
  formatGermanAmountInput,
  parseManualEntryAmount,
} from "@/lib/documents/manual-entry-input";

describe("parseManualEntryAmount", () => {
  it("parses German comma decimals", () => {
    expect(parseManualEntryAmount("129,90")).toBe(129.9);
    expect(parseManualEntryAmount("118,50")).toBe(118.5);
  });

  it("parses thousands dot with decimal comma", () => {
    expect(parseManualEntryAmount("1.234,56")).toBe(1234.56);
  });

  it("rejects percentages and empty input", () => {
    expect(parseManualEntryAmount("")).toBeNull();
    expect(parseManualEntryAmount("Skonto 15%")).toBeNull();
  });
});

describe("formatGermanAmountInput", () => {
  it("formats with two decimal places and comma", () => {
    expect(formatGermanAmountInput(118.5)).toBe("118,50");
    expect(formatGermanAmountInput(129.9)).toBe("129,90");
  });

  it("returns empty for null", () => {
    expect(formatGermanAmountInput(null)).toBe("");
  });
});
