import { describe, expect, it } from "vitest";

import { invoiceTextParseSchema } from "@/lib/ocr/text-parse-schema";
import {
  normalizeTeilegutachtenExtraction,
  teilegutachtenToAnalyzeFields,
  teilegutachtenToApprovalFields,
  teilegutachtenVehicleApprovals,
  vehicleApprovalsFromCompatibilityTable,
} from "@/lib/validations/teilegutachtenSchema";
import {
  buildTeilegutachtenMarkingSystemPrompt,
  buildTeilegutachtenSystemPrompt,
  buildTeilegutachtenVerwendungsbereichSystemPrompt,
} from "@/services/ocr/TeilegutachtenExtractionService";
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
    expect(prompt).toContain("modificationType");
    expect(prompt).toContain("issueDate");
    expect(prompt).toContain("Art der Umrüstung");
    expect(prompt).toContain("auflagen");
    expect(prompt).toContain("verwendungsbereich");
  });
});

describe("buildTeilegutachtenMarkingSystemPrompt", () => {
  it("targets physical part marking capture", () => {
    const prompt = buildTeilegutachtenMarkingSystemPrompt();
    expect(prompt).toContain("markingType");
    expect(prompt).toContain("markingNumber");
    expect(prompt).toContain("PHYSICAL");
    expect(prompt).toContain("Federwindungen");
  });
});

describe("buildTeilegutachtenVerwendungsbereichSystemPrompt", () => {
  it("targets full compatibility table extraction like ABE", () => {
    const prompt = buildTeilegutachtenVerwendungsbereichSystemPrompt();
    expect(prompt).toContain("compatibilityTable");
    expect(prompt).toContain("Verwendungsbereich");
    expect(prompt).toContain("Fahrzeughersteller");
    expect(prompt).toContain("ONE row per visible table row");
  });
});

describe("buildTeilegutachtenSystemPrompt vehicle context", () => {
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
  it("maps issueDate to analyze date", () => {
    const extracted = normalizeTeilegutachtenExtraction({
      documentType: "Teilegutachten",
      certificateNumber: "TG-9010",
      issueDate: "15.03.2021",
      manufacturer: "Eibach",
      partCategory: null,
      modificationType: null,
      markingType: null,
      markingNumber: null,
      partType: null,
      physicalMarking: null,
      requiresPhysicalInspection: true,
      testingOrganization: "TÜV",
      userVehicleMatchStatus: null,
      verwendungsbereich: null,
      ownerNotes: null,
      auflagen: null,
      matchedVehicleRow: null,
      compatibilityTable: null,
    });

    const fields = teilegutachtenToAnalyzeFields(extracted);
    expect(fields.date).toBe("2021-03-15");
  });

  it("maps modificationType to analyze partCategory", () => {
    const extracted = normalizeTeilegutachtenExtraction({
      documentType: "Teilegutachten",
      certificateNumber: "TG-9010",
      issueDate: null,
      manufacturer: "Eibach",
      partCategory: "Tieferlegungsfedern VA",
      modificationType: "Sonderfahrwerksfedern",
      markingType: null,
      markingNumber: null,
      partType: "21-85-041-01-VA",
      physicalMarking: null,
      requiresPhysicalInspection: true,
      testingOrganization: "TÜV",
      userVehicleMatchStatus: null,
      verwendungsbereich: "Mazda RX-8 (SE3P)",
      ownerNotes: null,
      auflagen: null,
      matchedVehicleRow: null,
      compatibilityTable: null,
    });

    const fields = teilegutachtenToAnalyzeFields(extracted);
    expect(fields.partCategory).toBe("Sonderfahrwerksfedern");
  });

  it("maps markingType and markingNumber to analyze notes", () => {
    const extracted = normalizeTeilegutachtenExtraction({
      documentType: "Teilegutachten",
      certificateNumber: "TG-9011",
      issueDate: null,
      manufacturer: "Eibach",
      partCategory: null,
      modificationType: null,
      partType: "21-85-041",
      physicalMarking: null,
      markingType: "Aufdruck auf den Federwindungen",
      markingNumber: "e1*47656",
      requiresPhysicalInspection: true,
      testingOrganization: "TÜV",
      userVehicleMatchStatus: null,
      verwendungsbereich: null,
      ownerNotes: null,
      auflagen: null,
      matchedVehicleRow: null,
      compatibilityTable: null,
    });

    const fields = teilegutachtenToAnalyzeFields(extracted);
    expect(fields.notes).toContain("Art der Kennzeichnung: Aufdruck");
    expect(fields.notes).toContain("Kennzeichnungsnummer: e1*47656");
  });

  it("forces requiresPhysicalInspection to true and maps auflagen", () => {
    const result = normalizeTeilegutachtenExtraction({
      documentType: "Teilegutachten",
      certificateNumber: "14-00123-CP-GBM",
      issueDate: null,
      manufacturer: "Eibach",
      partCategory: "Sonderfahrwerksfedern",
      modificationType: null,
      markingType: null,
      markingNumber: null,
      partType: "Eibach 21-85-041-01-VA",
      physicalMarking: "Aufdruck auf den Federwindungen",
      requiresPhysicalInspection: false,
      testingOrganization: "TÜV SÜD",
      userVehicleMatchStatus: "verified",
      verwendungsbereich: "Mazda RX-8 (SE3P) mit MZR-Enjin",
      ownerNotes: null,
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
      issueDate: null,
      manufacturer: null,
      partCategory: null,
      modificationType: null,
      markingType: null,
      markingNumber: null,
      partType: null,
      physicalMarking: null,
      requiresPhysicalInspection: true,
      testingOrganization: null,
      userVehicleMatchStatus: "not_found",
      verwendungsbereich: null,
      ownerNotes: null,
      auflagen: null,
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
      issueDate: null,
      manufacturer: null,
      partCategory: null,
      modificationType: null,
      markingType: null,
      markingNumber: null,
      partType: null,
      physicalMarking: null,
      requiresPhysicalInspection: true,
      testingOrganization: null,
      userVehicleMatchStatus: "not_found",
      verwendungsbereich: "Alle Mazda RX-8",
      ownerNotes: null,
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
    expect(review.vehicleApprovals).toEqual(["Mazda RX-8 (SE3P)"]);
    expect(review.auflagen).toEqual(["Sichtprüfung"]);
  });

  it("derives Art der Umrüstung in review from analyze fields", () => {
    const review = fieldsToTeilegutachtenReview(
      {
        vendor: "Eibach 21-85-041-01-VA",
        date: null,
        amount: null,
        category: "abe",
        summary: "Teilegutachten · Sonderfahrwerksfedern",
        lineItems: null,
        kbaNumber: "14-00123-CP-GBM",
        vehicleApprovals: null,
        authority: "TÜV Süd",
        conditions: null,
        partCategory: "Sonderfahrwerksfedern",
        notes: null,
        manufacturer: "Eibach",
        invoiceNumber: "14-00123-CP-GBM",
        mileageKm: null,
      },
      null,
    );

    expect(review.modificationType).toBe("Sonderfahrwerksfedern");
  });

  it("derives Fahrzeugfreigaben from compatibility table when analyze fields are empty", () => {
    const review = fieldsToTeilegutachtenReview(
      {
        vendor: "Eibach 21-85-041-01-VA",
        date: null,
        amount: null,
        category: "abe",
        summary: "Teilegutachten · Federn",
        lineItems: null,
        kbaNumber: "TG-9001",
        vehicleApprovals: null,
        authority: "TÜV",
        conditions: null,
        partCategory: "Federn",
        notes: null,
        manufacturer: "Eibach",
        invoiceNumber: "TG-9001",
        mileageKm: null,
      },
      {
        kind: "teilegutachten",
        data: {
          testingOrganization: "TÜV",
          documentNumber: "TG-9001",
          validityArea: "Fahrzeugfreigaben siehe Tabelle.",
          immediateInspectionRequired: true,
          compatibilityTable: {
            caption: "Verwendungsbereich",
            headers: ["Hersteller", "Modell", "Typ"],
            rows: [
              {
                id: "row-1",
                cells: ["Mazda", "RX-8", "SE3P"],
                isUserVehicleMatch: false,
                matchReason: null,
              },
              {
                id: "row-2",
                cells: ["BMW", "3er", "E90"],
                isUserVehicleMatch: false,
                matchReason: null,
              },
            ],
          },
        },
      },
    );

    expect(review.vehicleApprovals).toEqual([
      "Mazda · SE3P · RX-8",
      "BMW · E90 · 3er",
    ]);
  });

  it("preserves multiple Fahrzeugfreigaben from analyze fields", () => {
    const review = fieldsToTeilegutachtenReview(
      {
        vendor: "Eibach 21-85-041-01-VA",
        date: null,
        amount: null,
        category: "abe",
        summary: "Teilegutachten · Sonderfahrwerksfedern",
        lineItems: null,
        kbaNumber: "14-00123-CP-GBM",
        vehicleApprovals: ["Mazda RX-8 (SE3P)", "BMW 3er (E90)"],
        authority: "TÜV Süd",
        conditions: null,
        partCategory: "Sonderfahrwerksfedern",
        notes: null,
        manufacturer: "Eibach",
        invoiceNumber: "14-00123-CP-GBM",
        mileageKm: null,
      },
      null,
    );

    expect(review.vehicleApprovals).toEqual([
      "Mazda RX-8 (SE3P)",
      "BMW 3er (E90)",
    ]);
  });
});

describe("teilegutachten mappers", () => {
  const sample = normalizeTeilegutachtenExtraction({
    documentType: "Teilegutachten",
    certificateNumber: "14-00123-CP-GBM",
      issueDate: null,
    manufacturer: "Eibach",
    partCategory: "Sonderfahrwerksfedern",
    modificationType: null,
    markingType: null,
    markingNumber: null,
    partType: "Eibach 21-85-041-01-VA",
    physicalMarking: "Eingegossen",
    requiresPhysicalInspection: true,
    testingOrganization: "TÜV Süd",
    userVehicleMatchStatus: "verified",
    verwendungsbereich: "Mazda RX-8 (SE3P)",
    ownerNotes: null,
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
    expect(approval.data.validityArea).not.toContain("Auflagen:");
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
    expect(parsed.vehicleApprovals).toEqual(["Mazda RX-8 (SE3P)"]);
  });

  it("maps compatibility table rows to all vehicleApprovals", () => {
    const extracted = normalizeTeilegutachtenExtraction({
      documentType: "Teilegutachten",
      certificateNumber: "TG-9001",
      issueDate: null,
      manufacturer: "Eibach",
      partCategory: "Federn",
      modificationType: null,
      markingType: null,
      markingNumber: null,
      partType: "21-85-041",
      physicalMarking: null,
      requiresPhysicalInspection: true,
      testingOrganization: "TÜV",
      userVehicleMatchStatus: "verified",
      verwendungsbereich: "Siehe Tabelle",
      ownerNotes: null,
      auflagen: null,
      matchedVehicleRow: "Mazda RX-8 (SE3P)",
      compatibilityTable: {
        caption: "Verwendungsbereich",
        headers: ["Hersteller", "Modell", "Typ"],
        rows: [
          {
            id: "row-1",
            cells: ["Mazda", "RX-8", "SE3P"],
            isUserVehicleMatch: true,
            matchReason: null,
          },
          {
            id: "row-2",
            cells: ["BMW", "3er", "E90"],
            isUserVehicleMatch: false,
            matchReason: null,
          },
        ],
      },
    });

    expect(teilegutachtenVehicleApprovals(extracted)).toEqual([
      "Mazda · SE3P · RX-8",
      "BMW · E90 · 3er",
    ]);

    const fields = teilegutachtenToAnalyzeFields(extracted);
    expect(fields.vehicleApprovals).toEqual([
      "Mazda · SE3P · RX-8",
      "BMW · E90 · 3er",
    ]);
    const approval = teilegutachtenToApprovalFields(extracted);
    expect(approval.data.compatibilityTable?.headers).toEqual([
      "Hersteller",
      "Modell",
      "Typ",
    ]);
    expect(approval.data.compatibilityTable?.rows[0]?.cells).toEqual([
      "Mazda",
      "RX-8",
      "SE3P",
    ]);
  });

  it("falls back to Verwendungsbereich lines when no table", () => {
    const extracted = normalizeTeilegutachtenExtraction({
      documentType: "Teilegutachten",
      certificateNumber: "TG-9002",
      issueDate: null,
      manufacturer: null,
      partCategory: null,
      modificationType: null,
      markingType: null,
      markingNumber: null,
      partType: null,
      physicalMarking: null,
      requiresPhysicalInspection: true,
      testingOrganization: null,
      userVehicleMatchStatus: null,
      verwendungsbereich: "Mazda RX-8 (SE3P)\nBMW 3er (E90)",
      ownerNotes: null,
      auflagen: null,
      matchedVehicleRow: null,
      compatibilityTable: null,
    });

    expect(vehicleApprovalsFromCompatibilityTable({
      caption: null,
      headers: ["Hersteller", "Modell", "Typ"],
      rows: [
        {
          id: "r1",
          cells: ["Mazda", "RX-8", "SE3P"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
      ],
    })).toEqual(["Mazda · SE3P · RX-8"]);

    expect(teilegutachtenVehicleApprovals(extracted)).toEqual([
      "Mazda RX-8 (SE3P)",
      "BMW 3er (E90)",
    ]);
  });
});
