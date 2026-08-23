import { describe, expect, it } from "vitest";

import { resolveVendorName } from "@/lib/ocr/vendor-from-text";

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
});
