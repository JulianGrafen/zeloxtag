import { describe, expect, it } from "vitest";

import {
  fieldsToTuevReview,
  tuevDefectsForDisplay,
} from "@/components/dashboard/TuevOverview";
import { TUEV_COST_USER_PROMPT_LINES } from "@/lib/ocr/invoice-parse-prompts";
import { OCR_SAMPLES } from "@/lib/ocr/__fixtures__/ocr-samples";
import { buildInvoiceTextParseJsonSchema } from "@/lib/ocr/text-parse-schema";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import { sanitizeTuevPayload } from "@/services/documents/TuevReportService";
import {
  buildTuevSystemPrompt,
  TUEV_HEADER_MILEAGE_GUIDANCE,
  TUEV_JSON_SCHEMA,
  TUEV_PUNKT6_DEFECTS_GUIDANCE,
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
    expect(prompt).toContain("EM/GM");
    expect(prompt).toContain("Mängel");
    expect(prompt).toContain(TUEV_PUNKT6_DEFECTS_GUIDANCE);
    expect(prompt).toContain(TUEV_HEADER_MILEAGE_GUIDANCE);
    expect(prompt).toMatch(/Kopf|Header/i);
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

  it("JSON schema mileageKm references document header", () => {
    const mileageDesc = String(
      TUEV_JSON_SCHEMA.schema.properties.mileageKm.description,
    );
    expect(mileageDesc).toMatch(/Kopf|Header/i);
    expect(mileageDesc).toMatch(/KM-Stand|Kilometerstand/i);
  });

  it("cost prompt lines target header KM-Stand for vision parse", () => {
    const joined = TUEV_COST_USER_PROMPT_LINES.join(" ");
    expect(joined).toMatch(/Prüfgebühr|Kosten/i);
    expect(joined).toContain("category immer tuev");
    expect(joined).toMatch(/Kopf|Header/i);
    expect(joined).toMatch(/KM-Stand|Kilometerstand|mileageKm PFLICHT/i);
  });

  it("TÜV invoice JSON schema requires header mileage extraction", () => {
    const schema = buildInvoiceTextParseJsonSchema({ documentType: "tuev" });
    const mileageDesc = String(schema.schema.properties.mileageKm.description);
    expect(mileageDesc).toMatch(/Kopf|Header/i);
    expect(mileageDesc).not.toMatch(/Null if absent or for ABE\/TÜV/i);
    expect(String(schema.schema.properties.invoiceNumber.description)).toMatch(
      /Vorgangs/i,
    );
  });
});

describe("sanitizeTuevPayload · hybrid OCR merge", () => {
  it("discards hallucinated LLM defects when Punkt 6 OCR is empty", () => {
    const sanitized = sanitizeTuevPayload(
      {
        testingOrganization: "TÜV",
        testDate: "2026-03-12",
        result: "minor_defects",
        mileageKm: 85_400,
        nextInspectionDate: "2028-05",
        documentNumber: "HU-2026-991",
        defectsTable: [
          {
            checkpoint: "4.2.1a",
            description: "Halluzinierter Mangel",
            severity: "GM",
          },
        ],
        defectsList: null,
      },
      { ocrText: OCR_SAMPLES.tuevReportMangelfreiPunkt6 },
    );

    const parsed = new TuevReportService().parseAndValidate(sanitized);
    expect(parsed.defectsTable).toBeNull();
    expect(parsed.defectsList).toBeNull();
  });

  it("prefers OCR header KM-Stand over wrong LLM mileage via ocrText", () => {
    const sanitized = sanitizeTuevPayload(
      {
        testingOrganization: "TÜV",
        testDate: "2026-04-15",
        result: "no_defects",
        mileageKm: 12_345,
        nextInspectionDate: null,
        documentNumber: null,
        defectsTable: null,
        defectsList: null,
      },
      { ocrText: OCR_SAMPLES.tuevReportHeaderKmStand },
    );

    const parsed = new TuevReportService().parseAndValidate(sanitized);
    expect(parsed.mileageKm).toBe(142_350);
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
});
