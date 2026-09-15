import { describe, expect, it } from "vitest";

import { parseDocumentDateField } from "./document-date-field";

describe("parseDocumentDateField", () => {
  it("returns undefined when omitted", () => {
    expect(parseDocumentDateField(undefined)).toBeUndefined();
  });

  it("returns null for empty string", () => {
    expect(parseDocumentDateField("")).toBeNull();
    expect(parseDocumentDateField("   ")).toBeNull();
  });

  it("accepts ISO dates", () => {
    expect(parseDocumentDateField("2024-03-15")).toBe("2024-03-15");
  });

  it("normalizes German compact dates", () => {
    expect(parseDocumentDateField("15.03.2024")).toBe("2024-03-15");
  });

  it("rejects invalid values", () => {
    expect(parseDocumentDateField("not-a-date")).toBe("invalid");
    expect(parseDocumentDateField(42)).toBe("invalid");
  });
});
