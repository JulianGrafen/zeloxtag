import { describe, expect, it } from "vitest";

import {
  buildParagraph192BerichtSystemPrompt,
  buildParagraph192GutachtenSystemPrompt,
} from "@/services/ocr/Paragraph192ExtractionService";
import {
  inferPruefung192InspectionResult,
  mergeParagraph192Extractions,
  normalizeParagraph192Extraction,
  paragraph192ToApprovalFields,
} from "@/lib/validations/paragraph192Schema";

describe("buildParagraph192BerichtSystemPrompt", () => {
  it("targets Untersuchungsbericht page", () => {
    const prompt = buildParagraph192BerichtSystemPrompt();
    expect(prompt).toContain("§ 19");
    expect(prompt).toContain("Untersuchungsbericht");
    expect(prompt).toContain("reportNumber");
  });
});

describe("buildParagraph192GutachtenSystemPrompt", () => {
  it("extracts Field 22 only and skips ZB grid", () => {
    const prompt = buildParagraph192GutachtenSystemPrompt();
    expect(prompt).toContain("field22Text");
    expect(prompt).toContain("Do NOT extract");
    expect(prompt).toContain("B, J, E, 2.1");
  });
});

describe("normalizeParagraph192Extraction", () => {
  it("maps Ohne Mängel to no_defects", () => {
    const result = normalizeParagraph192Extraction({
      reportNumber: "PVR701DD-0",
      inspectionDate: "08.05.2026",
      vin: "WBAMX51020C763755",
      licensePlate: "EU JG 183",
      manufacturer: "BMW",
      vehicleType: "5K",
      variant: "MX51",
      ownerName: "Stefan Gräfen",
      testingOrganization: "TÜV Rheinland",
      inspectionLocation: "Euskirchen",
      inspectionResultText: "Ohne Mängel",
      mileageKm: 297972,
      firstRegistration: "31.01.2011",
      lastHu: "02.2026",
      officialExpert: "Tobias Schmitz",
      field22Text: null,
      assessedModifications: null,
      typeApprovalBase: null,
    });

    expect(result.inspectionResult).toBe("no_defects");
    expect(result.vin).toBe("WBAMX51020C763755");
  });
});

describe("mergeParagraph192Extractions", () => {
  it("merges field 22 from gutachten pass", () => {
    const bericht = normalizeParagraph192Extraction({
      reportNumber: "PVR701DD-0",
      inspectionDate: "08.05.2026",
      vin: "WBAMX51020C763755",
      licensePlate: null,
      manufacturer: "BMW",
      vehicleType: null,
      variant: null,
      ownerName: null,
      testingOrganization: "TÜV",
      inspectionLocation: null,
      inspectionResultText: "Ohne Mängel",
      mileageKm: null,
      firstRegistration: null,
      lastHu: null,
      officialExpert: null,
      field22Text: null,
      assessedModifications: null,
      typeApprovalBase: null,
    });

    const gutachten = normalizeParagraph192Extraction(
      {
        reportNumber: null,
        inspectionDate: null,
        vin: null,
        licensePlate: null,
        manufacturer: null,
        vehicleType: null,
        variant: null,
        ownerName: null,
        testingOrganization: null,
        inspectionLocation: null,
        inspectionResultText: null,
        mileageKm: null,
        firstRegistration: null,
        lastHu: null,
        officialExpert: null,
        field22Text: "KW AUTOMOTIVE Gewindefahrwerk",
        assessedModifications: null,
        typeApprovalBase: null,
      },
      { requireVin: false, zbTablePreserved: true },
    );

    const merged = mergeParagraph192Extractions(bericht, gutachten);
    expect(merged.field22Text).toContain("KW AUTOMOTIVE");
    expect(merged.zbTablePreserved).toBe(true);
  });
});

describe("inferPruefung192InspectionResult", () => {
  it("recognizes ohne mängel", () => {
    expect(inferPruefung192InspectionResult("Ergebnis: Ohne Mängel")).toBe(
      "no_defects",
    );
  });
});

describe("paragraph192ToApprovalFields", () => {
  it("stores zbTablePreserved flag", () => {
    const extracted = normalizeParagraph192Extraction(
      {
        reportNumber: "PVR701DD-0",
        inspectionDate: null,
        vin: "WBAMX51020C763755",
        licensePlate: null,
        manufacturer: null,
        vehicleType: null,
        variant: null,
        ownerName: null,
        testingOrganization: "TÜV Rheinland",
        inspectionLocation: null,
        inspectionResultText: null,
        mileageKm: null,
        firstRegistration: null,
        lastHu: null,
        officialExpert: "Schmitz",
        field22Text: "Federn",
        assessedModifications: null,
        typeApprovalBase: null,
      },
      { zbTablePreserved: true },
    );

    const approval = paragraph192ToApprovalFields(extracted);
    expect(approval.kind).toBe("pruefung192");
    expect(approval.data.zbTablePreserved).toBe(true);
  });
});
