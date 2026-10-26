import { describe, expect, it } from "vitest";

import { splitLineItemLabel } from "@/lib/documents/line-item-detail";

describe("splitLineItemLabel", () => {
  it.each([
    ["Arbeitszeit Inspektion 2,5 Std", "Arbeitszeit Inspektion", "2,5 Std"],
    ["Fahrwerk vermessen 12 AW", "Fahrwerk vermessen", "12 AW"],
    ["Zündkerzen 4 Stk", "Zündkerzen", "4 Stk"],
    ["Motoröl 5W-30 4,5 l", "Motoröl 5W-30", "4,5 l"],
    ["2 x Wischerblatt", "Wischerblatt", "2 x"],
  ])("splits %s", (label, title, detail) => {
    expect(splitLineItemLabel(label)).toEqual({ title, detail });
  });

  it("returns the label unchanged when there is no detail", () => {
    expect(splitLineItemLabel("Bremsflüssigkeit DOT4")).toEqual({
      title: "Bremsflüssigkeit DOT4",
      detail: null,
    });
  });

  it("does not treat tyre or oil specs as quantities", () => {
    expect(splitLineItemLabel("Reifen 225/40 R18").detail).toBeNull();
    expect(splitLineItemLabel("Öl 5W-30").detail).toBeNull();
  });

  it("moves additional lines into the detail", () => {
    expect(splitLineItemLabel("Inspektion\ninkl. Ölfilter")).toEqual({
      title: "Inspektion",
      detail: "inkl. Ölfilter",
    });
  });

  it("keeps the fragment as title when nothing else remains", () => {
    expect(splitLineItemLabel("2,5 Std")).toEqual({
      title: "2,5 Std",
      detail: null,
    });
  });

  it("handles empty labels", () => {
    expect(splitLineItemLabel("   ")).toEqual({ title: "", detail: null });
  });
});
