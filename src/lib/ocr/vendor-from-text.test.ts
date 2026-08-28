import { describe, expect, it } from "vitest";

import {
  isGenericInvoiceVendor,
  resolveVendorName,
} from "@/lib/ocr/vendor-from-text";

describe("isGenericInvoiceVendor", () => {
  it("rejects document-type labels and standalone placeholders", () => {
    expect(isGenericInvoiceVendor("Rechnung")).toBe(true);
    expect(isGenericInvoiceVendor("invoice")).toBe(true);
    expect(isGenericInvoiceVendor("Beleg")).toBe(true);
    expect(isGenericInvoiceVendor("Werkstatt")).toBe(true);
    expect(isGenericInvoiceVendor("Service")).toBe(true);
    expect(isGenericInvoiceVendor("Kunde")).toBe(true);
    expect(isGenericInvoiceVendor("")).toBe(true);
    expect(isGenericInvoiceVendor(null)).toBe(true);
  });

  it("accepts real workshop names", () => {
    expect(isGenericInvoiceVendor("Speedworkz")).toBe(false);
    expect(isGenericInvoiceVendor("TM Motorsport")).toBe(false);
    expect(isGenericInvoiceVendor("Kfz-Service Müller")).toBe(false);
  });
});

describe("resolveVendorName", () => {
  it("prefers visionVendor from logo over structured LLM vendor", () => {
    const vendor = resolveVendorName({
      structuredVendor: "Rechnung",
      logoCandidates: ["Kunde Max Mustermann"],
      visionVendor: "Motorsport Wagner GmbH",
      rawText: "Rechnung\nKunde Max Mustermann",
    });

    expect(vendor).toBe("Motorsport Wagner GmbH");
  });

  it("prefers visionVendor over misread OCR header line", () => {
    const vendor = resolveVendorName({
      structuredVendor: null,
      logoCandidates: ["RECHNUNG"],
      visionVendor: "BB-Automotive",
      rawText: "RECHNUNG\nDatum 01.01.2026",
    });

    expect(vendor).toBe("BB-Automotive");
  });

  it("falls back to structured vendor when vision is implausible", () => {
    const vendor = resolveVendorName({
      structuredVendor: "Kfz-Service Müller",
      logoCandidates: [],
      visionVendor: "Rechnung",
      rawText: "",
    });

    expect(vendor).toBe("Kfz-Service Müller");
  });

  it("rejects generic structured vendor when vision is missing", () => {
    const vendor = resolveVendorName({
      structuredVendor: "Rechnung",
      logoCandidates: [],
      visionVendor: null,
      rawText: "Datum 01.01.2026",
    });

    expect(vendor).toBeNull();
  });
});
