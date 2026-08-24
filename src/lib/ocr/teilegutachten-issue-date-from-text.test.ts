import { describe, expect, it } from "vitest";

import { extractAbeDateFromText } from "@/lib/ocr/abe-from-text";
import {
  enrichTeilegutachtenIssueDateFromOcr,
  mergeTeilegutachtenIssueDate,
} from "@/lib/ocr/teilegutachten-issue-date-from-text";
import type { TeilegutachtenExtraction } from "@/lib/validations/teilegutachtenSchema";

describe("mergeTeilegutachtenIssueDate", () => {
  it("prefers LLM date over OCR fallback", () => {
    expect(
      mergeTeilegutachtenIssueDate("2021-03-15", "2020-01-01"),
    ).toBe("2021-03-15");
  });

  it("falls back to OCR when LLM date is missing", () => {
    expect(mergeTeilegutachtenIssueDate(null, "15.03.2021")).toBe("2021-03-15");
  });
});

describe("enrichTeilegutachtenIssueDateFromOcr", () => {
  const base: TeilegutachtenExtraction = {
    documentType: "Teilegutachten",
    certificateNumber: "TG-1",
    issueDate: null,
    manufacturer: "Eibach",
    partCategory: null,
    modificationType: null,
    partType: null,
    physicalMarking: null,
    markingType: null,
    markingNumber: null,
    requiresPhysicalInspection: true,
    testingOrganization: "TÜV",
    userVehicleMatchStatus: null,
    verwendungsbereich: null,
    auflagen: null,
    matchedVehicleRow: null,
    compatibilityTable: null,
    technicalDataTable: null,
    ownerNotes: null,
  };

  it("fills missing issueDate from OCR cover text", () => {
    const ocr = `
Teilegutachten gem. § 19 Abs. 3 StVZO
Ausstellungsdatum: 15.03.2021
Gutachten-Nr.: TG-1
`;

    expect(extractAbeDateFromText(ocr)).toBe("2021-03-15");
    expect(enrichTeilegutachtenIssueDateFromOcr(base, ocr).issueDate).toBe(
      "2021-03-15",
    );
  });
});
