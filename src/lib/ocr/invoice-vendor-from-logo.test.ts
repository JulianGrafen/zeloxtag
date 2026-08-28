import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCanvas } from "@napi-rs/canvas";

vi.mock("./extract-vendor-from-logo", () => ({
  extractVendorFromLogoImage: vi.fn(),
}));

import { extractVendorFromLogoImage } from "@/lib/ocr/extract-vendor-from-logo";
import {
  extractVendorFromLogoHeader,
  mergeVisionVendorIntoInvoiceFields,
} from "@/lib/ocr/invoice-vendor-from-logo";
import type { OcrJsonPayload } from "@/lib/ocr/ocr-types";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";

function buildTestJpeg(): Buffer {
  const canvas = createCanvas(800, 1200);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 800, 1200);
  ctx.fillStyle = "#000000";
  ctx.font = "48px sans-serif";
  ctx.fillText("Speedworkz", 40, 80);
  return canvas.toBuffer("image/jpeg");
}

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

  it("does not keep generic structured vendor when vision is missing", () => {
    const fields = mergeVisionVendorIntoInvoiceFields(
      buildFields({ vendor: "Rechnung" }),
      buildOcrJson(),
      null,
    );

    expect(fields.vendor).toBeNull();
  });
});

describe("extractVendorFromLogoHeader fallback stages", () => {
  beforeEach(() => {
    vi.mocked(extractVendorFromLogoImage).mockReset();
  });

  it("tries wider header band after the first crop fails", async () => {
    vi.mocked(extractVendorFromLogoImage)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("TM Motorsport");

    const vendor = await extractVendorFromLogoHeader({
      bytes: buildTestJpeg(),
      contentType: "image/jpeg",
    });

    expect(vendor).toBe("TM Motorsport");
    expect(extractVendorFromLogoImage).toHaveBeenCalledTimes(2);
  });

  it("falls back to full page when header bands fail", async () => {
    vi.mocked(extractVendorFromLogoImage)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("Edge Logo GmbH");

    const vendor = await extractVendorFromLogoHeader({
      bytes: buildTestJpeg(),
      contentType: "image/jpeg",
    });

    expect(vendor).toBe("Edge Logo GmbH");
    expect(extractVendorFromLogoImage).toHaveBeenCalledTimes(3);
  });

  it("skips implausible vendor names and continues fallback stages", async () => {
    vi.mocked(extractVendorFromLogoImage)
      .mockResolvedValueOnce("Rechnung")
      .mockResolvedValueOnce("Speedworkz");

    const vendor = await extractVendorFromLogoHeader({
      bytes: buildTestJpeg(),
      contentType: "image/jpeg",
    });

    expect(vendor).toBe("Speedworkz");
    expect(extractVendorFromLogoImage).toHaveBeenCalledTimes(2);
  });
});
