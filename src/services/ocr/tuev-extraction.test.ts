import { describe, expect, it } from "vitest";

import {
  fieldsToTuevReview,
  tuevDefectsForDisplay,
} from "@/components/dashboard/TuevOverview";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import { sanitizeTuevPayload, parseTuevReportLenient } from "@/services/documents/TuevReportService";
import {
  buildTuevSystemPrompt,
  tuevVisionToAnalyzeFields,
  TUEV_ANTI_HALLUCINATION_GUIDANCE,
  TUEV_JSON_SCHEMA,
  TUEV_PRUEFPUNKT_DOT_GUIDANCE,
  TUEV_PUNKT3_PRUEFDATUM_GUIDANCE,
  TUEV_PUNKT4_MILEAGE_GUIDANCE,
  TUEV_PUNKT6_DEFECTS_GUIDANCE,
  TUEV_PUNKT6_TABLE_GUIDANCE,
} from "@/services/ocr/TuevExtractionService";
import { TuevReportService } from "@/services/documents";

function emptyInvoiceFields(
  overrides: Partial<InvoiceTextParseResult> = {},
): InvoiceTextParseResult {
  return {
    vendor: null,
    date: null,
    amount: null,
    category: "tuev",
    summary: null,
    lineItems: null,
    kbaNumber: null,
    vehicleApprovals: null,
    authority: null,
    conditions: null,
    partCategory: null,
    notes: null,
    manufacturer: null,
    invoiceNumber: null,
    mileageKm: null,
    ...overrides,
  };
}

describe("TuevExtractionService prompts & schema", () => {
  it("system prompt targets Punkt 6 HU/AU defects with EM/GM severity", () => {
    const prompt = buildTuevSystemPrompt();
    expect(prompt).toContain("Punkt 6");
    expect(prompt).toContain("defectsTable");
    expect(prompt).toMatch(/EM.*GM/);
    expect(prompt).toContain("Mängel");
    expect(prompt).toContain(TUEV_PUNKT6_DEFECTS_GUIDANCE);
    expect(prompt).toContain(TUEV_PUNKT6_TABLE_GUIDANCE);
    expect(prompt).toContain(TUEV_PRUEFPUNKT_DOT_GUIDANCE);
    expect(prompt).toContain(TUEV_PUNKT4_MILEAGE_GUIDANCE);
    expect(prompt).toContain(TUEV_PUNKT3_PRUEFDATUM_GUIDANCE);
    expect(prompt).toContain(TUEV_ANTI_HALLUCINATION_GUIDANCE);
    expect(prompt).toMatch(/Punkt 3|\(3\)\s*Prüftermin/i);
    expect(prompt).toMatch(/Punkt 4|Feld 4/i);
  });

  it("JSON schema requires defects fields and references Punkt 6", () => {
    expect(TUEV_JSON_SCHEMA.schema.required).toEqual(
      expect.arrayContaining(["defectsTable", "defectsList"]),
    );
    const tableDesc = String(
      TUEV_JSON_SCHEMA.schema.properties.defectsTable.description,
    );
    const listDesc = String(
      TUEV_JSON_SCHEMA.schema.properties.defectsList.description,
    );
    expect(tableDesc).toMatch(/Punkt 6/i);
    expect(listDesc).toMatch(/Punkt 6/i);
  });

  it("JSON schema requires vendor, amount, and lineItems for single vision call", () => {
    expect(TUEV_JSON_SCHEMA.schema.required).toEqual(
      expect.arrayContaining(["vendor", "amount", "lineItems"]),
    );
  });

  it("JSON schema testDate references Punkt 3 only", () => {
    const testDateDesc = String(
      TUEV_JSON_SCHEMA.schema.properties.testDate.description,
    );
    expect(testDateDesc).toMatch(/Punkt 3|\(3\)/i);
    expect(testDateDesc).not.toMatch(/HU-Datum/i);
  });

  it("JSON schema mileageKm references Punkt 4", () => {
    const mileageDesc = String(
      TUEV_JSON_SCHEMA.schema.properties.mileageKm.description,
    );
    expect(mileageDesc).toMatch(/Punkt 4|Feld 4|\(4\)/i);
  });
});

describe("sanitizeTuevPayload · LLM vision output", () => {
  it("preserves structured Punkt-6 defectsTable from LLM without OCR heuristics", () => {
    const sanitized = sanitizeTuevPayload({
      testingOrganization: "DEKRA",
      testDate: "2026-04-15",
      result: "minor_defects",
      mileageKm: 92_100,
      nextInspectionDate: "2028-04",
      documentNumber: "HU-2026-4421",
      defectsTable: [
        {
          checkpoint: "1.3.2",
          description: "Bremsbelag vorn nahe Verschleißgrenze",
          severity: "GM",
        },
        {
          checkpoint: "2.1.1",
          description: "Undichtigkeit Abgasanlage",
          severity: "EM",
        },
      ],
      defectsList: null,
    });

    const parsed = new TuevReportService().parseAndValidate(sanitized);
    expect(parsed.defectsTable).toHaveLength(2);
    expect(parsed.defectsTable?.[0]).toMatchObject({
      checkpoint: "1.3.2",
      severity: "GM",
    });
    expect(parsed.defectsList).toEqual([
      "[1.3.2] Bremsbelag vorn nahe Verschleißgrenze (GM)",
      "[2.1.1] Undichtigkeit Abgasanlage (EM)",
    ]);
  });

  it("preserves exact Prüfpunkt values on save without re-parsing or OCR dedup", () => {
    const sanitized = sanitizeTuevPayload({
      testingOrganization: "DEKRA",
      testDate: "2026-04-15",
      result: "minor_defects",
      mileageKm: 92_100,
      nextInspectionDate: "2028-04",
      documentNumber: "HU-2026-4421",
      defectsTable: [
        {
          checkpoint: "2.6b",
          description: "Reifen",
          severity: "EM",
        },
        {
          checkpoint: "1.1.13a",
          description: "Bremsbelag Achse 1",
          severity: "GM",
        },
        {
          checkpoint: "1.1.3a",
          description: "Bremsbelag Achse 2",
          severity: "GM",
        },
      ],
      defectsList: null,
    });

    const parsed = new TuevReportService().parseAndValidate(sanitized);
    expect(parsed.defectsTable?.map((row) => row.checkpoint)).toEqual([
      "2.6b",
      "1.1.13a",
      "1.1.3a",
    ]);
  });

  it("does not re-parse checkpoint from description when structured table is provided", () => {
    const sanitized = sanitizeTuevPayload({
      testingOrganization: "TÜV",
      testDate: "2026-04-15",
      result: "minor_defects",
      mileageKm: 92_100,
      nextInspectionDate: "2028-04",
      documentNumber: null,
      defectsTable: [
        {
          checkpoint: "2.6b",
          description: "2.6.1 (EM) Reifen — OCR noise in description",
          severity: "EM",
        },
      ],
      defectsList: null,
    });

    const parsed = new TuevReportService().parseAndValidate(sanitized);
    expect(parsed.defectsTable?.[0]?.checkpoint).toBe("2.6b");
    expect(parsed.defectsTable?.[0]?.description).toContain("2.6.1");
  });

  it("parses Punkt 6 Festgestellte Mängel structure with EM/GM sub-items", () => {
    const sanitized = sanitizeTuevPayload({
      testingOrganization: "TÜV",
      testDate: "2026-05-20",
      result: "minor_defects",
      mileageKm: 112_300,
      nextInspectionDate: "2028-05",
      documentNumber: "HU-2026-7788",
      defectsTable: [
        {
          checkpoint: "4.2.1a",
          description: "Scheinwerfer einstellen",
          severity: "GM",
        },
        {
          checkpoint: null,
          description: "Kennzeichenleuchte defekt",
          severity: "EM",
        },
      ],
      defectsList: [
        "[4.2.1a] Scheinwerfer einstellen (GM)",
        "Kennzeichenleuchte defekt (EM)",
      ],
    });

    const parsed = new TuevReportService().parseAndValidate(sanitized);
    expect(parsed.defectsTable).toHaveLength(2);
    expect(parsed.defectsTable?.[0]).toMatchObject({
      checkpoint: "4.2.1a",
      severity: "GM",
    });
    expect(parsed.defectsTable?.[1]).toMatchObject({
      description: "Kennzeichenleuchte defekt",
      severity: "EM",
    });
  });

  it("JSON schema checkpoint field requires dot-separated Prüfpunkte", () => {
    const checkpointDesc = String(
      TUEV_JSON_SCHEMA.schema.properties.defectsTable.items.properties
        .checkpoint.description,
    );
    expect(checkpointDesc).toMatch(/COPY VERBATIM|1\.1\.13a/i);
  });

  it("maps plain defectsList to rows without text heuristics", () => {
    const sanitized = sanitizeTuevPayload({
      testingOrganization: "TÜV",
      testDate: "2026-03-12",
      result: "minor_defects",
      mileageKm: 85_400,
      nextInspectionDate: "2028-05",
      documentNumber: null,
      defectsTable: null,
      defectsList: ["Scheinwerfer einstellen", "Kennzeichenleuchte defekt"],
    });

    const parsed = new TuevReportService().parseAndValidate(sanitized);
    expect(parsed.defectsTable).toEqual([
      { checkpoint: null, description: "Scheinwerfer einstellen", severity: null },
      { checkpoint: null, description: "Kennzeichenleuchte defekt", severity: null },
    ]);
  });

  it("parses dot-separated Prüfpunkte from defectsList when defectsTable is null", () => {
    const sanitized = sanitizeTuevPayload({
      testingOrganization: "TÜV",
      testDate: "2026-03-12",
      result: "minor_defects",
      mileageKm: 85_400,
      nextInspectionDate: "2028-05",
      documentNumber: null,
      defectsTable: null,
      defectsList: [
        "4.2.1 Bremsbelag (GM)",
        "1.3.2a Reifenprofil (EM)",
        "[6.1.4] Scheinwerfer einstellen (GM)",
      ],
    });

    const parsed = new TuevReportService().parseAndValidate(sanitized);
    expect(parsed.defectsTable).toEqual([
      {
        checkpoint: "4.2.1",
        description: "Bremsbelag",
        severity: "GM",
      },
      {
        checkpoint: "1.3.2a",
        description: "Reifenprofil",
        severity: "EM",
      },
      {
        checkpoint: "6.1.4",
        description: "Scheinwerfer einstellen",
        severity: "GM",
      },
    ]);
  });

  it("clears defects when result is no_defects (anti-hallucination)", () => {
    const sanitized = sanitizeTuevPayload({
      testingOrganization: "TÜV",
      testDate: "2026-03-12",
      result: "no_defects",
      mileageKm: 85_400,
      nextInspectionDate: "2028-05",
      documentNumber: null,
      defectsTable: [
        {
          checkpoint: "4.2.1",
          description: "Halluzinierter Mangel",
          severity: "GM",
        },
      ],
      defectsList: ["Fake defect"],
    });

    const parsed = new TuevReportService().parseAndValidate(sanitized);
    expect(parsed.result).toBe("no_defects");
    expect(parsed.defectsTable).toBeNull();
    expect(parsed.defectsList).toBeNull();
  });

  it("tuevVisionToAnalyzeFields maps single LLM extract to analyze fields", () => {
    const fields = tuevVisionToAnalyzeFields({
      report: {
        testingOrganization: "TÜV",
        testDate: "2026-03-12",
        result: "minor_defects",
        mileageKm: 142_350,
        nextInspectionDate: "2028-03",
        documentNumber: "HU-2026-991",
        defectsTable: null,
        defectsList: null,
      },
      vendor: "TÜV Süd · München",
      amount: 118.5,
      lineItems: [{ label: "HU", amount: 88.5 }],
      requiresManualReview: false,
    });

    expect(fields.category).toBe("tuev");
    expect(fields.mileageKm).toBe(142_350);
    expect(fields.amount).toBe(118.5);
    expect(fields.vendor).toBe("TÜV Süd · München");
    expect(fields.invoiceNumber).toBe("HU-2026-991");
  });

  it("parseTuevReportLenient recovers partial payload when result is unreadable", () => {
    const sanitized = sanitizeTuevPayload({
      testingOrganization: "TÜV",
      testDate: "invalid-date",
      result: "unleserlich",
      mileageKm: 85_400,
      nextInspectionDate: null,
      documentNumber: null,
      defectsTable: null,
      defectsList: null,
    });

    const { report, requiresManualReview } = parseTuevReportLenient(sanitized);
    expect(requiresManualReview).toBe(true);
    expect(report.testingOrganization).toBe("TÜV");
    expect(report.mileageKm).toBe(85_400);
    expect(report.result).toBe("no_defects");
    expect(report.testDate).toBeNull();
  });

  it("tuevVisionToAnalyzeFields surfaces manual review in notes", () => {
    const fields = tuevVisionToAnalyzeFields({
      report: {
        testingOrganization: "TÜV",
        testDate: null,
        result: "no_defects",
        mileageKm: null,
        nextInspectionDate: null,
        documentNumber: null,
        defectsTable: null,
        defectsList: null,
        requiresManualReview: true,
      },
      vendor: null,
      amount: null,
      lineItems: null,
      requiresManualReview: true,
    });
    expect(fields.notes).toMatch(/Manuelle Prüfung/i);
  });
});

describe("TuevOverview · review & display mapping", () => {
  it("fieldsToTuevReview merges LLM approval data with cost fields", () => {
    const approvalFields = {
      kind: "tuev" as const,
      data: {
        testingOrganization: "TÜV" as const,
        testDate: "2026-03-12",
        result: "minor_defects" as const,
        mileageKm: 85_400,
        nextInspectionDate: "2028-05",
        documentNumber: "HU-2026-991",
        defectsTable: [
          {
            checkpoint: "4.2.1a",
            description: "Scheinwerfer einstellen",
            severity: "GM" as const,
          },
        ],
        defectsList: ["[4.2.1a] Scheinwerfer einstellen (GM)"],
      },
    };

    const review = fieldsToTuevReview(
      emptyInvoiceFields({
        vendor: "TÜV Süd · München",
        amount: 118.5,
        lineItems: [{ label: "HU", amount: 88.5 }, { label: "AU", amount: 30 }],
        date: "2026-03-12",
        mileageKm: 85_400,
      }),
      approvalFields,
    );

    expect(review.amount).toBe(118.5);
    expect(review.lineItems).toHaveLength(2);
    expect(review.testDate).toBe("2026-03-12");
    expect(review.nextInspectionDate).toBe("2028-05");
    expect(review.workshopName).toBe("TÜV Süd · München");

    const defects = tuevDefectsForDisplay(approvalFields);
    expect(defects).toHaveLength(1);
    expect(defects?.[0]?.severity).toBe("GM");
  });

  it("tuevDefectsForDisplay prefers defectsTable over defectsList", () => {
    const table = tuevDefectsForDisplay({
      kind: "tuev",
      data: {
        testingOrganization: "DEKRA",
        testDate: null,
        result: "minor_defects",
        mileageKm: null,
        nextInspectionDate: null,
        documentNumber: null,
        defectsTable: [
          { checkpoint: "1.1", description: "Reifen Profiltiefe", severity: "GM" },
        ],
        defectsList: ["Fallback text"],
      },
    });
    expect(table).toHaveLength(1);
    expect(table?.[0]?.checkpoint).toBe("1.1");
  });

  it("tuevDefectsForDisplay falls back to defectsList", () => {
    const table = tuevDefectsForDisplay({
      kind: "tuev",
      data: {
        testingOrganization: "GTÜ",
        testDate: null,
        result: "minor_defects",
        mileageKm: null,
        nextInspectionDate: null,
        documentNumber: null,
        defectsTable: null,
        defectsList: ["Bremsflüssigkeit niedrig"],
      },
    });
    expect(table).toEqual([
      { checkpoint: null, description: "Bremsflüssigkeit niedrig", severity: null },
    ]);
  });

  it("tuevDefectsForDisplay parses dot-separated Prüfpunkte from defectsList", () => {
    const table = tuevDefectsForDisplay({
      kind: "tuev",
      data: {
        testingOrganization: "TÜV",
        testDate: null,
        result: "minor_defects",
        mileageKm: null,
        nextInspectionDate: null,
        documentNumber: null,
        defectsTable: null,
        defectsList: ["4.2.1 Bremsbelag (GM)", "1.3.2a Reifenprofil (EM)"],
      },
    });
    expect(table).toEqual([
      { checkpoint: "4.2.1", description: "Bremsbelag", severity: "GM" },
      { checkpoint: "1.3.2a", description: "Reifenprofil", severity: "EM" },
    ]);
  });
});
