import { describe, expect, it } from "vitest";

import {
  abeUploadSchema,
  ABE_UPLOAD_MAX_PAGES,
  mayRenderAbeValidBadge,
} from "@/lib/validations/abeComplianceSchemas";
import {
  AbeExtractSchema,
  isAbeExtractComplianceReady,
  requiresAbeManualFallback,
} from "@/lib/validations/abeVisionExtractionSchemas";

describe("abeUploadSchema", () => {
  it("accepts page counts up to the max", () => {
    expect(abeUploadSchema.safeParse({ pageCount: ABE_UPLOAD_MAX_PAGES }).success).toBe(
      true,
    );
  });

  it("rejects PDFs over the page budget", () => {
    expect(abeUploadSchema.safeParse({ pageCount: ABE_UPLOAD_MAX_PAGES + 1 }).success).toBe(
      false,
    );
  });
});

describe("mayRenderAbeValidBadge", () => {
  it("allows badge when KBA is present", () => {
    expect(mayRenderAbeValidBadge({ kbaNumber: "48571" })).toBe(true);
  });

  it("allows badge when ABE number is present", () => {
    expect(mayRenderAbeValidBadge({ abeNr: "E1 123456" })).toBe(true);
  });

  it("allows badge when the owner confirmed the extract", () => {
    expect(mayRenderAbeValidBadge({ userConfirmed: true })).toBe(true);
  });

  it("forbids badge for part-only extracts", () => {
    expect(mayRenderAbeValidBadge({ kbaNumber: null, abeNr: null })).toBe(false);
  });
});

describe("AbeExtractSchema compliance", () => {
  it("rejects high-confidence extracts without KBA or ABE number", () => {
    const parsed = AbeExtractSchema.safeParse({
      kba_number: null,
      abe_nr: null,
      part_type: "Felge",
      auflagen: [],
      confidence_score: 95,
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts extracts with KBA even at high confidence", () => {
    const parsed = AbeExtractSchema.safeParse({
      kba_number: "48571",
      abe_nr: null,
      part_type: "Felge",
      auflagen: [],
      confidence_score: 95,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("requiresAbeManualFallback", () => {
  it("forces manual review when only part_type was extracted", () => {
    expect(
      requiresAbeManualFallback({
        kba_number: null,
        abe_nr: null,
        part_type: "Felge",
        auflagen: [],
        confidence_score: 70,
      }),
    ).toBe(true);
  });

  it("allows review flow when compliance identifiers exist", () => {
    const extraction = {
      kba_number: "48571",
      abe_nr: null,
      part_type: "Felge",
      auflagen: [],
      confidence_score: 90,
    };
    expect(isAbeExtractComplianceReady(extraction)).toBe(true);
    expect(requiresAbeManualFallback(extraction)).toBe(false);
  });
});
