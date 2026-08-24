import { describe, expect, it } from "vitest";

import { resolveManualEntryTitle } from "@/lib/documents/manual-entries";

describe("resolveManualEntryTitle", () => {
  it("keeps a user-provided title", () => {
    expect(resolveManualEntryTitle("  KW V3  ", "tuning")).toBe("KW V3");
  });

  it("defaults service entries without title", () => {
    expect(resolveManualEntryTitle("", "service")).toBe("Wartungseintrag");
  });

  it("defaults tuning and umbau entries without title", () => {
    expect(resolveManualEntryTitle("", "tuning")).toBe("Umbau / Tuning");
    expect(resolveManualEntryTitle("", "service", { umbau: true })).toBe(
      "Umbau / Tuning",
    );
  });
});
