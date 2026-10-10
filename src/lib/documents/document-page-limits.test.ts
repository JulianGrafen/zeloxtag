import { describe, expect, it } from "vitest";

import {
  documentAppendPhotoLimit,
  resolveDocumentPageCount,
} from "./document-page-limits";

describe("documentAppendPhotoLimit", () => {
  it("allows up to 12 pages when no file exists yet", () => {
    expect(documentAppendPhotoLimit(0)).toBe(12);
  });

  it("subtracts existing pages from the cap", () => {
    expect(documentAppendPhotoLimit(10)).toBe(2);
    expect(documentAppendPhotoLimit(12)).toBe(0);
  });
});

describe("resolveDocumentPageCount", () => {
  it("returns stored page count when present", () => {
    expect(resolveDocumentPageCount(5, true)).toBe(5);
  });

  it("defaults to one page when file exists without count", () => {
    expect(resolveDocumentPageCount(null, true)).toBe(1);
  });
});
