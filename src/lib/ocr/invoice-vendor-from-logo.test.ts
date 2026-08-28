import { describe, expect, it } from "vitest";

import { mergeVisionVendorIntoInvoiceFields } from "@/lib/ocr/invoice-vendor-from-logo";
import type { OcrJsonPayload } from "@/lib/ocr/ocr-types";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";

function buildFields(
  overrides: Partial<InvoiceTextParseResult> = {},
): InvoiceTextParseResult {
  return {
    vendor: "Rechnung",
    date: "2026-01-15",
    amount: 659.78,
    category: "other",
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

function buildOcrJson(overrides: Partial<OcrJsonPayload> = {}): OcrJsonPayload {
  return {
    modelId: "stub",
    locale: "de-DE",
    pageCount: 1,
    text: "Rechnung\nKunde Max Mustermann",
    coverText: "",
    headerLines: ["Rechnung", "Kunde Max Mustermann"],
    contentFormat: "text",
    ...overrides,
  };
}

describe("mergeVisionVendorIntoInvoiceFields", () => {
  it("prefers visionVendor from logo over generic structured vendor", () => {
    const fields = mergeVisionVendorIntoInvoiceFields(
      buildFields({ vendor: "Rechnung" }),
      buildOcrJson(),
      "Motorsport Wagner GmbH",
    );

    expect(fields.vendor).toBe("Motorsport Wagner GmbH");
  });

  it("falls back to structured vendor when visionVendor is null", () => {
    const fields = mergeVisionVendorIntoInvoiceFields(
      buildFields({ vendor: "Kfz-Service Müller" }),
      buildOcrJson(),
      null,
    );

    expect(fields.vendor).toBe("Kfz-Service Müller");
  });

  it("falls back to structured vendor when visionVendor is implausible", () => {
    const fields = mergeVisionVendorIntoInvoiceFields(
      buildFields({ vendor: "Kfz-Service Müller" }),
      buildOcrJson(),
      "Rechnung",
    );

    expect(fields.vendor).toBe("Kfz-Service Müller");
  });
});
