import { describe, expect, it } from "vitest";

import {
  FREE_AI_ABE_SCAN_LIMIT,
  FREE_AI_INVOICE_SCAN_LIMIT,
} from "@/lib/billing/free-scan-constants";
import {
  FEATURE,
  paywallBody,
  paywallTitle,
} from "@/lib/permissions/feature-access";

describe("free scan paywall copy", () => {
  it("mentions the complimentary scans in the default scan paywall", () => {
    expect(paywallTitle(FEATURE.SCAN_AI_RECEIPT)).toContain("Pro");
    expect(paywallBody(FEATURE.SCAN_AI_RECEIPT)).toContain(
      String(FREE_AI_INVOICE_SCAN_LIMIT),
    );
    expect(paywallBody(FEATURE.SCAN_AI_RECEIPT)).toContain(
      String(FREE_AI_ABE_SCAN_LIMIT),
    );
  });

  it("uses exhausted copy after the free scans", () => {
    expect(paywallTitle(FEATURE.SCAN_AI_RECEIPT, "free_scan_exhausted")).toBe(
      "Dein Gratis-Scan ist verbraucht",
    );
    expect(
      paywallBody(FEATURE.SCAN_AI_RECEIPT, "free_scan_exhausted"),
    ).toContain("kostenlosen KI-Scans");
  });
});

describe("scan type free-tier helpers", () => {
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

  it("treats only classic ABE as complimentary scan type", async () => {
    const { isComplimentaryAbeScanType } = await import(
      "@/lib/documents/scan-types"
    );
    expect(isComplimentaryAbeScanType("abe")).toBe(true);
    expect(isComplimentaryAbeScanType("vault")).toBe(false);
    expect(isComplimentaryAbeScanType("gutachten")).toBe(false);
  });
});
