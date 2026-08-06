import { describe, expect, it } from "vitest";

import {
  DocumentServiceFactory,
  EGBEService,
  isDocumentValidationError,
  isUnsupportedDocumentTypeError,
  sanitizeTuevPayload,
  TuevReportService,
} from "@/services/documents";

describe("DocumentServiceFactory", () => {
  it("dispatches tuev / teilegutachten / einzelabnahme / egbe", () => {
    expect(DocumentServiceFactory.create("tuev").documentType).toBe("tuev");
    expect(DocumentServiceFactory.create("teilegutachten").documentType).toBe(
      "teilegutachten",
    );
    expect(DocumentServiceFactory.create("einzelabnahme").documentType).toBe(
      "einzelabnahme",
    );
    expect(DocumentServiceFactory.create("egbe").documentType).toBe("egbe");
  });

  it("throws structured error for unknown types", () => {
    try {
      DocumentServiceFactory.create("unknown");
      expect.unreachable();
    } catch (error) {
      expect(isUnsupportedDocumentTypeError(error)).toBe(true);
      if (isUnsupportedDocumentTypeError(error)) {
        expect(error.toJSON()).toMatchObject({
          ok: false,
          code: "UNSUPPORTED_DOCUMENT_TYPE",
          received: "unknown",
        });
      }
    }
  });

  it("returns structured Zod issues for invalid teilegutachten", () => {
    try {
      DocumentServiceFactory.parseAndValidate("teilegutachten", {
        testingOrganization: "TÜV",
        documentNumber: "",
        validityArea: "x",
        immediateInspectionRequired: true,
      });
      expect.unreachable();
    } catch (error) {
      expect(isDocumentValidationError(error)).toBe(true);
      if (isDocumentValidationError(error)) {
        const body = error.toJSON();
        expect(body.code).toBe("DOCUMENT_VALIDATION_FAILED");
        expect(body.documentType).toBe("teilegutachten");
        expect(body.issues.length).toBeGreaterThan(0);
      }
    }
  });

  it("validates a minimal EG-BE payload", () => {
    const data = new EGBEService().parseAndValidate({
      eMark: "e1*2007/46*0123",
      componentGroup: "Beleuchtung",
    });
    expect(data.eMark).toMatch(/^e1/i);
  });
});

describe("TuevReportService", () => {
  const service = new TuevReportService();

  it("sanitizes German OCR noise into a valid TÜV report", () => {
    const data = service.parseAndValidate({
      testingOrganization: "TÜV SÜD",
      testDate: "12.03.2026",
      result: "ohne erhebliche Mängel",
      mileageKm: "85.400 km",
      nextInspectionDate: "05/2028",
      documentNumber: " HU-2026-991 ",
      defectsList: "Bremsbelag nahe Verschleißgrenze\nScheibenwischer vorne",
    });

    expect(data).toEqual({
      testingOrganization: "TÜV",
      testDate: "2026-03-12",
      result: "no_defects",
      mileageKm: 85400,
      nextInspectionDate: "2028-05",
      documentNumber: "HU-2026-991",
      defectsList: [
        "Bremsbelag nahe Verschleißgrenze",
        "Scheibenwischer vorne",
      ],
    });
  });

  it("maps organization aliases and defect severity phrases", () => {
    expect(sanitizeTuevPayload({ testingOrganization: "GTUE", result: "geringfügige Mängel" })).toMatchObject({
      testingOrganization: "GTÜ",
      result: "minor_defects",
    });
    expect(
      sanitizeTuevPayload({
        testingOrganization: "KUES",
        result: "erhebliche Mängel",
      }),
    ).toMatchObject({
      testingOrganization: "KÜS",
      result: "major_defects",
    });
    expect(
      sanitizeTuevPayload({
        testingOrganization: "DEKRA",
        result: "gefährliche Mängel",
      }),
    ).toMatchObject({
      testingOrganization: "DEKRA",
      result: "dangerous_defects",
    });
    expect(
      sanitizeTuevPayload({
        testingOrganization: "other",
        result: "nicht bestanden",
      }),
    ).toMatchObject({ result: "failed" });
  });

  it("throws DocumentValidationError when result is missing after sanitize", () => {
    try {
      service.parseAndValidate({
        testingOrganization: "TÜV",
        result: "unleserlich",
      });
      expect.unreachable();
    } catch (error) {
      expect(isDocumentValidationError(error)).toBe(true);
      if (isDocumentValidationError(error)) {
        expect(error.toJSON()).toMatchObject({
          ok: false,
          code: "DOCUMENT_VALIDATION_FAILED",
          documentType: "tuev",
        });
      }
    }
  });

  it("passes non-objects through so Zod fails at the root", () => {
    expect(sanitizeTuevPayload("not-json")).toBe("not-json");
    expect(() => service.parseAndValidate(null)).toThrow();
  });
});
