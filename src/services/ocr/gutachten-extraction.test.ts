import { describe, expect, it } from "vitest";

import {
  gutachtenToApprovalFields,
  gutachtenToAnalyzeFields,
  legacyApprovalKindToGutachtenSubtype,
  normalizeGutachtenExtraction,
} from "@/lib/validations/gutachtenSchema";

describe("gutachtenSchema", () => {
  it("normalizes LLM payload with null optionals", () => {
    const result = normalizeGutachtenExtraction({
      documentSubtype: "EINZELABNAHME",
      partName: " KW V3 Gewindefahrwerk ",
      manufacturer: "KW Automotive",
      certificateNumber: "14-TG-0892-00",
      testOrganization: "TÜV Rheinland",
      issueDate: "2024-03-15",
      vehicleMatchNotes: null,
    });

    expect(result.documentSubtype).toBe("EINZELABNAHME");
    expect(result.partName).toBe("KW V3 Gewindefahrwerk");
    expect(result.issueDate).toBe("2024-03-15");
  });

  it("maps legacy approval kinds to subtypes", () => {
    expect(legacyApprovalKindToGutachtenSubtype("teilegutachten")).toBe(
      "TEILEGUTACHTEN",
    );
    expect(legacyApprovalKindToGutachtenSubtype("einzelabnahme")).toBe(
      "EINZELABNAHME",
    );
    expect(legacyApprovalKindToGutachtenSubtype("pruefung192")).toBe(
      "ANBAUBESTAETIGUNG",
    );
    expect(legacyApprovalKindToGutachtenSubtype("abe")).toBeNull();
  });

  it("maps extraction to approval_fields and flat analyze fields", () => {
    const extraction = normalizeGutachtenExtraction({
      documentSubtype: "TEILEGUTACHTEN",
      partName: "Spoiler",
      manufacturer: null,
      certificateNumber: "TG-123",
      testOrganization: "DEKRA",
      issueDate: null,
      vehicleMatchNotes: "BMW F11",
    });

    const approval = gutachtenToApprovalFields(extraction);
    expect(approval.kind).toBe("gutachten");
    expect(approval.data.documentSubtype).toBe("TEILEGUTACHTEN");

    const fields = gutachtenToAnalyzeFields(extraction);
    expect(fields.category).toBe("abe");
    expect(fields.partCategory).toBe("Spoiler");
    expect(fields.summary).toContain("Spoiler");
  });
});
