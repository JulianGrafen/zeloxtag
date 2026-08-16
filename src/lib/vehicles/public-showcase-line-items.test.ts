import { describe, expect, it } from "vitest";

import { parseLineItems } from "@/lib/documents/line-items";
import {
  listShowcaseLineItemOptions,
  parseShowcaseLineSelections,
  selectedShowcaseLineIndexes,
  visibleShowcaseLineItems,
  withShowcaseLineSelection,
} from "@/lib/vehicles/public-showcase-line-items";

describe("public showcase line items", () => {
  const items = [
    { label: "KW V3", amount: 1290 },
    { label: "Arbeitslohn", amount: 180 },
    { label: "H&R Stabilisator", amount: 320 },
  ];

  it("lists only part positions, not labor", () => {
    expect(listShowcaseLineItemOptions(items).map((row) => row.label)).toEqual([
      "KW V3",
      "H&R Stabilisator",
    ]);
  });

  it("treats unset flags as all eligible positions selected", () => {
    expect(selectedShowcaseLineIndexes(items)).toEqual([0, 2]);
    expect(visibleShowcaseLineItems(items, true).map((row) => row.label)).toEqual(
      ["KW V3", "H&R Stabilisator"],
    );
  });

  it("keeps only explicitly opted-in positions once flags exist", () => {
    const selected = withShowcaseLineSelection(items, new Set([2]));
    expect(selectedShowcaseLineIndexes(selected)).toEqual([2]);
    expect(
      visibleShowcaseLineItems(selected, true).map((row) => row.label),
    ).toEqual(["H&R Stabilisator"]);
    expect(
      visibleShowcaseLineItems(selected, false).map((row) => row.label),
    ).toEqual(["KW V3", "H&R Stabilisator"]);
  });

  it("preserves showcase flags when parsing JSONB payloads", () => {
    expect(
      parseLineItems([
        { label: "KW V3", amount: 1290, showOnPublicShowcase: true },
        { label: "H&R Stabilisator", amount: 320, show_on_public_showcase: false },
      ]),
    ).toEqual([
      { label: "KW V3", amount: 1290, showOnPublicShowcase: true },
      { label: "H&R Stabilisator", amount: 320, showOnPublicShowcase: false },
    ]);
  });

  it("sanitizes line-selection payloads", () => {
    expect(
      parseShowcaseLineSelections({
        "doc-1": [2, 2, 0, -1, 99, "x"],
        "": [1],
      }),
    ).toEqual({ "doc-1": [0, 2] });
  });
});
