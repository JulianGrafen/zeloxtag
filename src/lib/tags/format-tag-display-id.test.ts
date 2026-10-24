import { describe, expect, it } from "vitest";

import { formatTagDisplayId } from "./format-tag-display-id";

describe("formatTagDisplayId", () => {
  it("returns four zero-padded digits from uuid tail", () => {
    expect(formatTagDisplayId("zlx-8f3a9b2c")).toMatch(/^\d{4}$/);
  });

  it("is stable for the same uuid", () => {
    const id = formatTagDisplayId("zlx-demo-active");
    expect(formatTagDisplayId("zlx-demo-active")).toBe(id);
  });
});
