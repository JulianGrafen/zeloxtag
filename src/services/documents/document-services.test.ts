import { describe, expect, it } from "vitest";

import {
  DocumentServiceFactory,
  EGBEService,
  isDocumentValidationError,
  isUnsupportedDocumentTypeError,
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
