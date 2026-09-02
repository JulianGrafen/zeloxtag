import { describe, expect, it } from "vitest";

import { createStoreZip } from "@/lib/zip/store-zip";

describe("createStoreZip", () => {
  it("creates a valid ZIP with one stored entry", () => {
    const zip = createStoreZip([{ name: "test.svg", data: "<svg/>" }]);
    expect(zip.subarray(0, 4).toString("hex")).toBe("504b0304");
    expect(zip.subarray(zip.length - 22, zip.length - 18).toString("hex")).toBe(
      "504b0506",
    );
  });

  it("includes all entry names in the archive", () => {
    const zip = createStoreZip([
      { name: "a.svg", data: "a" },
      { name: "b.svg", data: "b" },
    ]);
    const text = zip.toString("binary");
    expect(text).toContain("a.svg");
    expect(text).toContain("b.svg");
  });

  it("rejects empty archives", () => {
    expect(() => createStoreZip([])).toThrow(/at least one file/i);
  });
});
