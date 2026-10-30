import { describe, expect, it } from "vitest";

import { getMockTagScan, MOCK_TAG_UUIDS } from "./mock-tags";
import { isMockTagUuid } from "./get-tag-by-uuid";

describe("getTagByUuid mock document load", () => {
  it("recognizes all showcase mock tag uuids", () => {
    expect(isMockTagUuid(MOCK_TAG_UUIDS.active)).toBe(true);
    expect(isMockTagUuid(MOCK_TAG_UUIDS.aulitzky)).toBe(true);
    expect(isMockTagUuid(MOCK_TAG_UUIDS.undergroundGarage)).toBe(true);
    expect(isMockTagUuid(MOCK_TAG_UUIDS.rwEdition)).toBe(true);
  });

  it("demo catalog includes invoices and abes for profile sections", () => {
    const scan = getMockTagScan(MOCK_TAG_UUIDS.active);
    expect(scan?.documents.some((doc) => doc.type === "invoice")).toBe(true);
    expect(scan?.documents.some((doc) => doc.type === "abe")).toBe(true);
  });
});
