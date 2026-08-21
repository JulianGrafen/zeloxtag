import { describe, expect, it } from "vitest";

import {
  formatCompactGermanDate,
  formatDocumentDate,
  formatDocumentDateCompact,
  normalizeDocumentDateIso,
} from "@/lib/documents/format";

describe("normalizeDocumentDateIso", () => {
  it("parses mixed OCR / UI formats to ISO", () => {
    expect(normalizeDocumentDateIso("2026-08-13")).toBe("2026-08-13");
    expect(normalizeDocumentDateIso("2026-08-13T14:22:00Z")).toBe("2026-08-13");
    expect(normalizeDocumentDateIso("22.08.2026")).toBe("2026-08-22");
    expect(normalizeDocumentDateIso("08/22/2026")).toBe("2026-08-22");
    expect(normalizeDocumentDateIso("13.08", { defaultYear: 2026 })).toBe(
      "2026-08-13",
    );
    expect(normalizeDocumentDateIso("12. Aug 2026")).toBe("2026-08-12");
    expect(normalizeDocumentDateIso("12. Aug", { defaultYear: 2026 })).toBe(
      "2026-08-12",
    );
    expect(normalizeDocumentDateIso("12. August 2026")).toBe("2026-08-12");
  });
});

describe("document date display", () => {
  it("formats compact numeric DE dates consistently", () => {
    expect(formatCompactGermanDate("2026-08-13")).toBe("13.08.2026");
    expect(formatDocumentDateCompact("13.08.2026")).toBe("13.08.2026");
    expect(formatDocumentDateCompact("12. Aug 2026")).toBe("12.08.2026");
  });

  it("formats long DE dates from raw OCR text", () => {
    expect(formatDocumentDate("22.08.2026")).toBe("22.08.2026");
    expect(formatDocumentDate("12. Aug 2026")).toBe("12.08.2026");
  });
});
