import { describe, expect, it } from "vitest";

import {
  manualEntryEditPath,
  resolveManualEntryTitle,
} from "@/lib/documents/manual-entries";

describe("manualEntryEditPath", () => {
  const vehicleId = "11111111-1111-4111-8111-111111111111";
  const docId = "22222222-2222-4222-8222-222222222222";

  it("uses garage routes when no tag is linked", () => {
    expect(
      manualEntryEditPath(
        { vehicleId, linkedTagUuid: null },
        docId,
        "service",
        { focusPhotos: true },
      ),
    ).toBe(
      `/garage/${vehicleId}/eintrag?edit=${docId}&photos=1`,
    );
  });

  it("uses tag routes when a tag uuid is linked", () => {
    expect(
      manualEntryEditPath(
        { vehicleId, linkedTagUuid: "zlx-demo123" },
        docId,
        "tuning",
      ),
    ).toBe(`/v/zlx-demo123/umbauten?edit=${docId}`);
  });
});

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
