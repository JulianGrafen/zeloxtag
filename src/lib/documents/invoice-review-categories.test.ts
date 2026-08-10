import { describe, expect, it } from "vitest";

import {
  invoiceReviewCategoryFromScanType,
  normalizeInvoiceReviewCategory,
} from "@/lib/documents/invoice-review-categories";

describe("invoice review categories", () => {
  it("normalizes OCR categories to review options", () => {
    expect(normalizeInvoiceReviewCategory("tuning")).toBe("tuning");
    expect(normalizeInvoiceReviewCategory("repair")).toBe("repair");
    expect(normalizeInvoiceReviewCategory("service")).toBe("service");
    expect(normalizeInvoiceReviewCategory("other", "repair")).toBe("repair");
    expect(normalizeInvoiceReviewCategory("tuev", "tuning")).toBe("tuning");
  });

  it("maps scan types to default review categories", () => {
    expect(invoiceReviewCategoryFromScanType("repair")).toBe("repair");
    expect(invoiceReviewCategoryFromScanType("service")).toBe("service");
    expect(invoiceReviewCategoryFromScanType("invoice")).toBe("service");
  });
});
