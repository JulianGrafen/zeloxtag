import { describe, expect, it } from "vitest";

import { isPdfJsPasswordError } from "@/lib/ocr/pdf-js-document";
import { formatPdfClientError } from "@/lib/ocr/pdf-source";

describe("formatPdfClientError", () => {
  it("maps password errors to German guidance", () => {
    const err = { name: "PasswordException", message: "Needs password" };
    expect(isPdfJsPasswordError(err)).toBe(true);
    expect(formatPdfClientError(err)).toMatch(/passwortgeschützt/i);
  });

  it("maps invalid PDF messages", () => {
    expect(formatPdfClientError(new Error("Invalid PDF structure"))).toMatch(
      /beschädigt|gültiges PDF/i,
    );
  });

  it("falls back for unknown errors", () => {
    expect(formatPdfClientError(new Error("boom"))).toContain("boom");
    expect(formatPdfClientError(null)).toMatch(/konnte nicht gelesen werden/i);
  });
});
