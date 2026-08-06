import { describe, expect, it } from "vitest";

import { invoiceTextParseSchema } from "@/lib/ocr/text-parse-schema";
import {
  MissingVinError,
  normalizeParagraph21Extraction,
  normalizeVin,
  paragraph21ToAnalyzeFields,
  paragraph21ToApprovalFields,
  verifyVehicleMatch,
} from "@/lib/validations/paragraph21Schema";
import { buildParagraph21SystemPrompt } from "@/services/ocr/Paragraph21ExtractionService";

describe("buildParagraph21SystemPrompt", () => {
  it("references Fahrzeugschein grid fields E, 2, D.3, 22", () => {
    const prompt = buildParagraph21SystemPrompt();
    expect(prompt).toContain("Field E");
    expect(prompt).toContain("Field 2");
    expect(prompt).toContain("Field D.3");
    expect(prompt).toContain("Field 22");
    expect(prompt).toContain("verbatim");
    expect(prompt).toContain("NOT an ABE");
  });
});

describe("normalizeParagraph21Extraction", () => {
  it("normalizes a complete §21 payload", () => {
    const result = normalizeParagraph21Extraction({
      documentNumber: "0DE0CAL09MV009494",
      issueDate: "12.04.2019",
      vin: " 2tm000104 ",
      manufacturer: "YAMAHA (J)",
      model: "SRX 600",
      modificationsField22:
        "AUSN.:FAHRTRICHTANZ.FEDERND BEFESTIGT*LENKRAD:SPARCO*",
      additionalRemarks: "Siehe Anlage",
    });

    expect(result.vin).toBe("2TM000104");
    expect(result.documentNumber).toBe("0DE0CAL09MV009494");
    expect(result.modificationsField22).toContain("*");
  });

  it("throws MissingVinError when Field E is absent", () => {
    expect(() =>
      normalizeParagraph21Extraction({
        documentNumber: "0DE0CAL09MV009494",
        issueDate: "12.04.2019",
        vin: null,
        manufacturer: "YAMAHA (J)",
        model: "SRX 600",
        modificationsField22: "Änderungen",
        additionalRemarks: null,
      }),
    ).toThrow(MissingVinError);
  });
});

describe("verifyVehicleMatch", () => {
  it("matches normalized VINs exactly", () => {
    expect(verifyVehicleMatch("2TM000104", "2tm 000104")).toBe(true);
    expect(verifyVehicleMatch("2TM000104", "2TM000105")).toBe(false);
  });

  it("returns false when either VIN is empty", () => {
    expect(verifyVehicleMatch("", "2TM000104")).toBe(false);
    expect(normalizeVin("abc")).toBeNull();
  });
});

describe("paragraph21 mappers", () => {
  const sample = normalizeParagraph21Extraction({
    documentNumber: "0DE0CAL09MV009494",
    issueDate: "12.04.2019",
    vin: "2TM000104",
    manufacturer: "YAMAHA (J)",
    model: "SRX 600",
    modificationsField22: "AUSN.:FAHRTRICHTANZ.*",
    additionalRemarks: null,
  });

  it("maps to Einzelabnahme approval_fields", () => {
    const approval = paragraph21ToApprovalFields(sample);
    expect(approval.kind).toBe("einzelabnahme");
    expect(approval.data.field22Text).toContain("AUSN.");
    expect(approval.data.reportNumber).toBe("0DE0CAL09MV009494");
  });

  it("maps to analyze fields with VIN match note", () => {
    const fields = paragraph21ToAnalyzeFields(sample, false);
    expect(fields.category).toBe("abe");
    expect(fields.date).toBe("2019-04-12");
    expect(fields.vehicleApprovals).toEqual(["VIN 2TM000104"]);
    expect(fields.notes).toContain("stimmt NICHT");
  });

  it("maps to invoiceTextParseSchema-compatible analyze fields", () => {
    const fields = paragraph21ToAnalyzeFields(sample, true);
    expect(invoiceTextParseSchema.safeParse(fields).success).toBe(true);
  });
});
