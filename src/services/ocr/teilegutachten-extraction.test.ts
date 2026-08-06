import { describe, expect, it } from "vitest";

import { invoiceTextParseSchema } from "@/lib/ocr/text-parse-schema";
import {
  normalizeTeilegutachtenExtraction,
  teilegutachtenToAnalyzeFields,
  teilegutachtenToApprovalFields,
} from "@/lib/validations/teilegutachtenSchema";
import { buildTeilegutachtenSystemPrompt } from "@/services/ocr/TeilegutachtenExtractionService";
import { fieldsToTeilegutachtenReview } from "@/components/dashboard/TeilegutachtenOverview";

describe("buildTeilegutachtenSystemPrompt", () => {
  it("distinguishes TGA from ABE and §21", () => {
    const prompt = buildTeilegutachtenSystemPrompt();
    expect(prompt).toContain("Teilegutachten");
    expect(prompt).toContain("§ 19 Abs. 3");
    expect(prompt).toContain("NOT an ABE");
    expect(prompt).toContain("NOT a");
    expect(prompt).toContain("Einzelabnahme");
    expect(prompt).toContain("Kennzeichnung");
    expect(prompt).toContain("physicalMarking");
    expect(prompt).toContain("auflagen");
    expect(prompt).toContain("verwendungsbereich");
  });

  it("includes target vehicle when context is provided", () => {
    const prompt = buildTeilegutachtenSystemPrompt({
      brand: "Mazda",
      model: "RX-8",
      type: "SE3P",
    });
    expect(prompt).toContain("Mazda RX-8");
    expect(prompt).toContain("Verwendungsbereich");
    expect(prompt).toContain("Auflagen");
  });
});

describe("normalizeTeilegutachtenExtraction", () => {
  it("forces requiresPhysicalInspection to true and maps auflagen", () => {
    const result = normalizeTeilegutachtenExtraction({
      documentType: "Teilegutachten",
      certificateNumber: "14-00123-CP-GBM",
      manufacturer: "Eibach",
      partCategory: "Sonderfahrwerksfedern",
      partType: "Eibach 21-85-041-01-VA",
      physicalMarking: "Aufdruck auf den Federwindungen",
      requiresPhysicalInspection: false,
      testingOrganization: "TÜV SÜD",
      userVehicleMatchStatus: "verified",
      verwendungsbereich: "Mazda RX-8 (SE3P) mit MZR-Enjin",
      auflagen: ["Sichtprüfung der Befestigungspunkte"],
      matchedVehicleRow: "Mazda RX-8 (SE3P)",
      compatibilityTable: null,
    });

    expect(result.documentType).toBe("Teilegutachten");
    expect(result.requiresPhysicalInspection).toBe(true);
    expect(result.physicalMarking).toBe("Aufdruck auf den Federwindungen");
    expect(result.verwendungsbereich).toContain("Mazda RX-8");
    expect(result.auflagen).toEqual(["Sichtprüfung der Befestigungspunkte"]);
  });

  it("maps matchedConditions alias to auflagen", () => {
    const result = normalizeTeilegutachtenExtraction({
      documentType: "Teilegutachten",
      certificateNumber: "TG-8821",
      manufacturer: null,
      partCategory: null,
      partType: null,
      physicalMarking: null,
      requiresPhysicalInspection: true,
      testingOrganization: null,
      userVehicleMatchStatus: "not_found",
      matchedConditions: ["Achsvermessung erforderlich"],
      matchedVehicleRow: "Mazda RX-8 (SE3P)",
      compatibilityTable: null,
    });

    expect(result.auflagen).toEqual(["Achsvermessung erforderlich"]);
  });

  it("keeps auflagen even when vehicle match is not_found", () => {
    const result = normalizeTeilegutachtenExtraction({
      documentType: "Teilegutachten",
      certificateNumber: "TG-8821",
      manufacturer: null,
      partCategory: null,
      partType: null,
      physicalMarking: null,
      requiresPhysicalInspection: true,
      testingOrganization: null,
      userVehicleMatchStatus: "not_found",
      verwendungsbereich: "Alle Mazda RX-8",
      auflagen: ["Sichtprüfung der Befestigungspunkte"],
      matchedVehicleRow: "should remain",
      compatibilityTable: null,
    });

    expect(result.auflagen).toEqual(["Sichtprüfung der Befestigungspunkte"]);
    expect(result.verwendungsbereich).toBe("Alle Mazda RX-8");
  });
});

describe("fieldsToTeilegutachtenReview", () => {
  it("preserves full Gutachtennummer without KBA normalization", () => {
    const review = fieldsToTeilegutachtenReview(
      {
        vendor: "Eibach 21-85-041-01-VA",
        date: null,
        amount: null,
        category: "abe",
        summary: "Teilegutachten · Sonderfahrwerksfedern",
        lineItems: null,
        kbaNumber: "14-00123-CP-GBM",
        vehicleApprovals: ["Mazda RX-8 (SE3P)"],
        authority: "TÜV Süd",
        conditions: ["Sichtprüfung"],
        partCategory: "Sonderfahrwerksfedern",
        notes:
          "Verwendungsbereich:\nMazda RX-8 (SE3P)\n\nKennzeichnung: Aufdruck auf den Federwindungen",
        manufacturer: "Eibach",
        invoiceNumber: "14-00123-CP-GBM",
        mileageKm: null,
      },
      {
        kind: "teilegutachten",
        data: {
          testingOrganization: "TÜV",
          documentNumber: "14-00123-CP-GBM",
          validityArea:
            "Mazda RX-8 (SE3P)\n\nAuflagen:\nSichtprüfung\n\nKennzeichnung: Aufdruck",
          immediateInspectionRequired: true,
        },
      },
    );

    expect(review.certificateNumber).toBe("14-00123-CP-GBM");
    expect(review.physicalMarking).toContain("Aufdruck");
    expect(review.verwendungsbereich).toContain("Mazda RX-8");
    expect(review.auflagen).toEqual(["Sichtprüfung"]);
  });
});

describe("teilegutachten mappers", () => {
  const sample = normalizeTeilegutachtenExtraction({
    documentType: "Teilegutachten",
    certificateNumber: "14-00123-CP-GBM",
    manufacturer: "Eibach",
    partCategory: "Sonderfahrwerksfedern",
    partType: "Eibach 21-85-041-01-VA",
    physicalMarking: "Eingegossen",
    requiresPhysicalInspection: true,
    testingOrganization: "TÜV Süd",
    userVehicleMatchStatus: "verified",
    verwendungsbereich: "Mazda RX-8 (SE3P)",
    auflagen: ["Achsvermessung erforderlich"],
    matchedVehicleRow: "Mazda RX-8 (SE3P)",
    compatibilityTable: null,
  });

  it("maps to approval_fields with immediateInspectionRequired true", () => {
    const approval = teilegutachtenToApprovalFields(sample);
    expect(approval.kind).toBe("teilegutachten");
    expect(approval.data.immediateInspectionRequired).toBe(true);
    expect(approval.data.documentNumber).toBe("14-00123-CP-GBM");
    expect(approval.data.validityArea).toContain("Mazda RX-8");
    expect(approval.data.validityArea).toContain("Auflagen:");
    expect(approval.data.validityArea).toContain("Achsvermessung");
    expect(approval.data.validityArea).toContain("Kennzeichnung");
  });

  it("maps to analyze fields with inspection warning", () => {
    const fields = teilegutachtenToAnalyzeFields(sample);
    const parsed = invoiceTextParseSchema.parse(fields);
    expect(parsed.summary).toContain("Teilegutachten");
    expect(parsed.notes).toContain("Anbauabnahme");
    expect(parsed.notes).toContain("Verwendungsbereich");
    expect(parsed.notes).toContain("Kennzeichnung");
    expect(parsed.conditions).toEqual(["Achsvermessung erforderlich"]);
  });
});
