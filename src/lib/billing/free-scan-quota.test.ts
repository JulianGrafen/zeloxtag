import { describe, expect, it } from "vitest";

import { FREE_AI_INVOICE_SCAN_LIMIT } from "@/lib/billing/free-scan-quota";
import {
  FEATURE,
  paywallBody,
  paywallTitle,
} from "@/lib/permissions/feature-access";

describe("free scan paywall copy", () => {
  it("mentions the complimentary scan in the default scan paywall", () => {
    expect(paywallTitle(FEATURE.SCAN_AI_RECEIPT)).toContain("Pro");
    expect(paywallBody(FEATURE.SCAN_AI_RECEIPT)).toContain(
      String(FREE_AI_INVOICE_SCAN_LIMIT),
    );
  });

  it("uses exhausted copy after the free scan", () => {
    expect(paywallTitle(FEATURE.SCAN_AI_RECEIPT, "free_scan_exhausted")).toBe(
      "Dein Gratis-Scan ist verbraucht",
    );
    expect(
      paywallBody(FEATURE.SCAN_AI_RECEIPT, "free_scan_exhausted"),
    ).toContain("kostenlosen KI-Rechnungsscan");
  });
});

describe("isInvoiceFamilyScanType", () => {
  it("treats invoice, repair and service as invoice OCR family", async () => {
    const { isInvoiceFamilyScanType } = await import(
      "@/lib/documents/scan-types"
    );
    expect(isInvoiceFamilyScanType("invoice")).toBe(true);
    expect(isInvoiceFamilyScanType("repair")).toBe(true);
    expect(isInvoiceFamilyScanType("service")).toBe(true);
    expect(isInvoiceFamilyScanType("abe")).toBe(false);
    expect(isInvoiceFamilyScanType("tuev")).toBe(false);
  });
});
