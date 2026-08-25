/**
 * Pre-deploy extraction quality gate.
 * Runs deterministic mock OCR samples through heuristics + strategy services
 * (no Azure / LLM calls).
 */

import { describe, expect, it } from "vitest";

import { parseApprovalFields } from "@/lib/documents/approval-fields";
import {
  parseScanType,
  SCAN_TYPE_OPTIONS,
  scanTypeDefinition,
} from "@/lib/documents/scan-types";
import { extractAmountFromText, preferAmount } from "@/lib/ocr/amount-from-text";
import { detectApprovalKind } from "@/lib/ocr/detect-approval-kind";
import { extractApprovalFieldsFromText } from "@/lib/ocr/extract-approval-fields";
import {
  inferInvoiceCategory,
  looksLikeCommercialInvoice,
  preferInvoiceCategory,
} from "@/lib/ocr/infer-invoice-category";
import { extractMileageKmFromText } from "@/lib/ocr/mileage-from-text";
import { DocumentServiceFactory } from "@/services/documents";
import {
  gutachtenToAnalyzeFields,
  resolveGutachtenDocumentSubtype,
  resolveGutachtenExtractionSubtype,
  type GutachtenExtraction,
} from "@/lib/validations/gutachtenSchema";
import {
  resolveGutachtenDocumentSubtype as resolveSubtypeDirect,
  scoreGutachtenDocumentSubtypes,
} from "@/lib/documents/gutachten-subtype-resolution";
import { invoiceTextParseSchema } from "@/lib/ocr/text-parse-schema";
import { sanitizeTuevPayload } from "@/services/documents/TuevReportService";

import { OCR_SAMPLES } from "./__fixtures__/ocr-samples";

describe("pre-deploy extraction quality · category", () => {
  it("does not classify workshop invoices with TÜV/DEKRA mentions as tuev", () => {
    const text = OCR_SAMPLES.workshopInvoiceWithTuevMention;
    expect(looksLikeCommercialInvoice(text)).toBe(true);
    expect(inferInvoiceCategory(text)).not.toBe("tuev");
    expect(preferInvoiceCategory("tuev", text)).not.toBe("tuev");
  });

  it("classifies oil-change invoices as service", () => {
    expect(inferInvoiceCategory(OCR_SAMPLES.oilChangeInvoice)).toBe("service");
  });

  it("classifies brake repair as repair", () => {
    expect(inferInvoiceCategory(OCR_SAMPLES.brakeRepairInvoice)).toBe("repair");
  });

  it("classifies real HU/AU reports as tuev", () => {
    expect(inferInvoiceCategory(OCR_SAMPLES.tuevReportPass)).toBe("tuev");
    expect(inferInvoiceCategory(OCR_SAMPLES.tuevReportMinorDefects)).toBe(
      "tuev",
    );
  });
});

describe("pre-deploy extraction quality · amounts", () => {
  it("extracts Zahlbetrag and ignores Skonto percentages", () => {
    const text = OCR_SAMPLES.percentSkontoTrap;
    const amount = extractAmountFromText(text);
    expect(amount).toBe(238);
    // LLM mistakenly returning 15 from "-15%" must be vetoed.
    expect(preferAmount(15, text, null)).toBe(238);
  });

  it("extracts workshop invoice total", () => {
    expect(
      extractAmountFromText(OCR_SAMPLES.workshopInvoiceWithTuevMention),
    ).toBe(714);
  });

  it("extracts mileage from oil-change invoice", () => {
    expect(extractMileageKmFromText(OCR_SAMPLES.oilChangeInvoice)).toBe(67_210);
  });

  it("extracts KM-Stand from TÜV report header", () => {
    expect(extractMileageKmFromText(OCR_SAMPLES.tuevReportHeaderKmStand)).toBe(
      142_350,
    );
    expect(extractMileageKmFromText(OCR_SAMPLES.tuevReportPass)).toBe(85_400);
    expect(extractMileageKmFromText(OCR_SAMPLES.tuevReportMinorDefects)).toBe(
      120_500,
    );
  });
});

describe("pre-deploy extraction quality · approval kind detection", () => {
  it("detects unified gutachten for Teilegutachten and Einzelabnahme text", () => {
    expect(detectApprovalKind(OCR_SAMPLES.teilegutachten)).toBe("gutachten");
    expect(detectApprovalKind(OCR_SAMPLES.einzelabnahme)).toBe("gutachten");
  });

  it.each([
    ["egbe", OCR_SAMPLES.egbe],
    ["abe", OCR_SAMPLES.classicAbe],
    ["tuev", OCR_SAMPLES.tuevReportPass],
  ] as const)("detects %s", (kind, text) => {
    expect(detectApprovalKind(text)).toBe(kind);
  });

  it("does not treat workshop bills as gutachten/tuev subtypes", () => {
    const kind = detectApprovalKind(OCR_SAMPLES.workshopInvoiceWithTuevMention);
    expect(kind).not.toBe("tuev");
    expect(kind).not.toBe("gutachten");
  });
});

describe("pre-deploy extraction quality · structured approval fields", () => {
  it("extracts Teilegutachten fields via strategy service", () => {
    const fields = extractApprovalFieldsFromText(
      OCR_SAMPLES.teilegutachten,
      "teilegutachten",
    );
    expect(fields.kind).toBe("teilegutachten");
    if (fields.kind !== "teilegutachten") return;
    expect(fields.data.testingOrganization).toBe("TÜV");
    expect(fields.data.documentNumber).toMatch(/TG-19-3-8821/i);
    expect(fields.data.validityArea.toLowerCase()).toContain("mazda");
    expect(fields.data.immediateInspectionRequired).toBe(true);
    expect(parseApprovalFields(fields)).toEqual(fields);
  });

  it("extracts Einzelabnahme Feld 22", () => {
    const fields = extractApprovalFieldsFromText(
      OCR_SAMPLES.einzelabnahme,
      "einzelabnahme",
    );
    expect(fields.kind).toBe("einzelabnahme");
    if (fields.kind !== "einzelabnahme") return;
    expect(fields.data.officialExpert).toMatch(/Mustermann/i);
    expect(fields.data.reportNumber).toMatch(/EA-2026/i);
    expect(fields.data.field22Text.toLowerCase()).toContain("sportfedern");
  });

  it("extracts EG-BE e-mark", () => {
    const fields = extractApprovalFieldsFromText(OCR_SAMPLES.egbe, "egbe");
    expect(fields.kind).toBe("egbe");
    if (fields.kind !== "egbe") return;
    expect(fields.data.eMark.toLowerCase()).toMatch(/^e1\*/);
    expect(fields.data.componentGroup.toLowerCase()).toContain("beleuchtung");
  });

  it("extracts TÜV report with preferred kind (scan picker)", () => {
    const fields = extractApprovalFieldsFromText(
      OCR_SAMPLES.tuevReportPass,
      "tuev",
    );
    expect(fields.kind).toBe("tuev");
    if (fields.kind !== "tuev") return;
    expect(fields.data.result).toBe("no_defects");
    expect(fields.data.mileageKm).toBe(85_400);
    expect(fields.data.nextInspectionDate).toBe("2028-05");
    expect(fields.data.testDate).toBe("2026-03-12");
    expect(fields.data.documentNumber).toMatch(/HU-2026-991/i);
  });

  it("extracts KM-Stand from TÜV document header (Kopf)", () => {
    const fields = extractApprovalFieldsFromText(
      OCR_SAMPLES.tuevReportHeaderKmStand,
      "tuev",
    );
    expect(fields.kind).toBe("tuev");
    if (fields.kind !== "tuev") return;
    expect(fields.data.mileageKm).toBe(142_350);
    expect(fields.data.testDate).toBe("2026-04-15");
  });

  it("maps geringfügige Mängel + defect list", () => {
    const fields = extractApprovalFieldsFromText(
      OCR_SAMPLES.tuevReportMinorDefects,
      "tuev",
    );
    expect(fields.kind).toBe("tuev");
    if (fields.kind !== "tuev") return;
    expect(fields.data.result).toBe("minor_defects");
    expect(fields.data.testingOrganization).toBe("DEKRA");
    expect(fields.data.defectsList?.some((d) => /bremsbelag/i.test(d))).toBe(
      true,
    );
  });

  it("honors preferred scan kind over weak brand noise", () => {
    // Explicit picker intent for Teilegutachten on a clear TG sample.
    const fields = extractApprovalFieldsFromText(
      OCR_SAMPLES.teilegutachten,
      "teilegutachten",
    );
    expect(fields.kind).toBe("teilegutachten");
  });
});

describe("pre-deploy extraction quality · TuevReportService sanitize", () => {
  it("normalizes German OCR payloads before Zod", () => {
    const sanitized = sanitizeTuevPayload({
      testingOrganization: "TÜV Süd",
      testDate: "12.03.2026",
      result: "ohne erhebliche Mängel",
      mileageKm: "85.400 km",
      nextInspectionDate: "05/2028",
      documentNumber: "",
      defectsList: ["", "Bremsbelag nahe Verschleißgrenze"],
    });
    const parsed = DocumentServiceFactory.parseAndValidate("tuev", sanitized);
    expect(parsed).toMatchObject({
      testingOrganization: "TÜV",
      testDate: "2026-03-12",
      result: "no_defects",
      mileageKm: 85_400,
      nextInspectionDate: "2028-05",
      documentNumber: null,
      defectsList: null,
      defectsTable: null,
    });
  });
});

describe("pre-deploy extraction quality · scan type catalog", () => {
  it("maps every upload picker type to a stable OCR route", () => {
    for (const { id } of SCAN_TYPE_OPTIONS) {
      expect(parseScanType(id)).toBe(id);
      const def = scanTypeDefinition(id);
      expect(def.ocrDocumentType).toMatch(/^(invoice|abe|tuev)$/);
      expect(def.heading.length).toBeGreaterThan(3);
    }
    expect(SCAN_TYPE_OPTIONS.some((opt) => opt.id === "egbe")).toBe(false);
    expect(SCAN_TYPE_OPTIONS.some((opt) => opt.id === "repair")).toBe(false);
    expect(SCAN_TYPE_OPTIONS.some((opt) => opt.id === "gutachten")).toBe(false);
  });

  it("keeps repair defined for legacy deep links and OCR", () => {
    expect(parseScanType("repair")).toBe("repair");
    expect(scanTypeDefinition("repair").category).toBe("repair");
    expect(parseScanType("egbe")).toBe("egbe");
    expect(scanTypeDefinition("egbe").approvalKind).toBe("egbe");
  });

  it("routes gutachten through ABE OCR bucket and normalizes legacy scan types", () => {
    expect(scanTypeDefinition("gutachten").ocrDocumentType).toBe("abe");
    expect(scanTypeDefinition("gutachten").approvalKind).toBe("gutachten");
    expect(parseScanType("teilegutachten")).toBe("gutachten");
    expect(parseScanType("einzelabnahme")).toBe("gutachten");
    expect(scanTypeDefinition("teilegutachten").approvalKind).toBe("gutachten");
    expect(scanTypeDefinition("tuev").ocrDocumentType).toBe("tuev");
  });
});

describe("pre-deploy extraction quality · gutachten analyze fields", () => {
  it("normalizes oversized gutachten OCR fields for /api/ocr/parse validation", () => {
    const extraction: GutachtenExtraction = {
      documentSubtype: "TEILEGUTACHTEN",
      partName: "KW V3 Gewindefahrwerk".repeat(8),
      modificationType: "Art der Umrüstung ".repeat(120),
      modificationsField22: "Feld 22 ".repeat(400),
      vehicleMatchNotes: "Verwendungsbereich ".repeat(80),
      certificateNumber: "14-TG-0892-00",
      testOrganization: "TÜV Rheinland",
      issueDate: "2024-03-15",
      conditions: ["Auflage ".repeat(200)],
    };

    const fields = gutachtenToAnalyzeFields(extraction);
    expect(invoiceTextParseSchema.safeParse(fields).success).toBe(true);
    expect(fields.summary?.length ?? 0).toBeLessThanOrEqual(80);
    expect(fields.notes?.length ?? 0).toBeLessThanOrEqual(500);
  });

  it("infers gutachten subtype from OCR text when LLM returns SONSTIGES", () => {
    expect(
      resolveSubtypeDirect({
        llmSubtype: "SONSTIGES",
        extraction: { documentSubtype: "SONSTIGES", partName: "Gewindefahrwerk" },
        fields: {
          vendor: null,
          date: null,
          amount: null,
          category: "abe",
          summary: "TEILEGUTACHTEN",
          lineItems: null,
          kbaNumber: null,
          vehicleApprovals: null,
          authority: null,
          conditions: null,
          partCategory: OCR_SAMPLES.teilegutachten.slice(0, 400),
          notes: null,
          manufacturer: null,
          invoiceNumber: null,
          mileageKm: null,
        },
      }),
    ).toBe("TEILEGUTACHTEN");

    expect(
      resolveSubtypeDirect({
        llmSubtype: "SONSTIGES",
        extraction: { documentSubtype: "SONSTIGES", partName: "Fahrwerk" },
        fields: {
          vendor: "TÜV Rheinland",
          date: null,
          amount: null,
          category: "abe",
          summary: "Prüfung",
          lineItems: null,
          kbaNumber: null,
          vehicleApprovals: null,
          authority: null,
          conditions: null,
          partCategory: OCR_SAMPLES.pruefung192.slice(0, 400),
          notes: null,
          manufacturer: null,
          invoiceNumber: null,
          mileageKm: null,
        },
      }),
    ).toBe("ANBAUBESTAETIGUNG");
  });

  it("resolves §19(2) from raw OCR text even when LLM guesses Teilegutachten", () => {
    expect(
      resolveGutachtenDocumentSubtype({
        llmSubtype: "TEILEGUTACHTEN",
        extraction: {
          documentSubtype: "TEILEGUTACHTEN",
          partName: "Gewindefahrwerk",
        },
        fields: gutachtenToAnalyzeFields({
          documentSubtype: "TEILEGUTACHTEN",
          partName: "Gewindefahrwerk",
        }),
        rawText: OCR_SAMPLES.pruefung192,
      }),
    ).toBe("ANBAUBESTAETIGUNG");
  });
});
