import { describe, expect, it } from "vitest";

import {
  analyzeInvoiceCaptureFraming,
  invoiceFramingReady,
} from "@/lib/utils/invoice-capture-framing";

describe("analyzeInvoiceCaptureFraming", () => {
  it("detects when the user is too far away", () => {
    const result = analyzeInvoiceCaptureFraming(300, 700);
    expect(result.status).toBe("too_far");
    expect(result.message).toMatch(/Näher heran/i);
  });

  it("detects when the page does not fit", () => {
    const result = analyzeInvoiceCaptureFraming(650, 700);
    expect(result.status).toBe("too_close");
  });

  it("accepts a well-framed capture", () => {
    const result = analyzeInvoiceCaptureFraming(520, 700);
    expect(result.status).toBe("good");
    expect(invoiceFramingReady(result)).toBe(true);
  });
});
