import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sniffAllowedMime } from "./file-upload";
import {
  findPdfActiveContent,
  hardenUploadBytes,
  lastPdfEofIndex,
  pdfHeaderOffset,
  stripJpegTrailer,
  stripPngTrailer,
} from "./upload-hardening";
import { documentFileSecurityHeaderEntries } from "./csp";

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

const CLEAN_PDF = encode(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF
`);

const JS_PDF = encode(`%PDF-1.4
1 0 obj
<< /Type /Catalog /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF
`);

const JPEG_SOI = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff,
  0xd9,
]);

describe("upload hardening", () => {
  it("sniffs JPEG vs HTML", () => {
    expect(sniffAllowedMime(JPEG_SOI)).toBe("image/jpeg");
    expect(sniffAllowedMime(encode("<html><script>"))).toBeNull();
  });

  it("detects PDF JavaScript / OpenAction outside streams", () => {
    expect(findPdfActiveContent(CLEAN_PDF)).toBeNull();
    expect(findPdfActiveContent(JS_PDF)).toBe("OpenAction");
  });

  it("requires a leading %PDF- header and %%EOF", () => {
    expect(pdfHeaderOffset(CLEAN_PDF)).toBe(0);
    expect(lastPdfEofIndex(CLEAN_PDF)).toBeGreaterThan(0);
    expect(pdfHeaderOffset(encode("<html>%PDF-1.4\n%%EOF\n"))).toBe(-1);
  });

  it("rejects PDFs with active content", async () => {
    const result = await hardenUploadBytes(JS_PDF, "application/pdf", {
      reencodeImages: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/aktive Inhalte/i);
    }
  });

  it("accepts a page-only PDF", async () => {
    const result = await hardenUploadBytes(CLEAN_PDF, "application/pdf", {
      reencodeImages: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(pdfHeaderOffset(result.bytes)).toBe(0);
      expect(findPdfActiveContent(result.bytes)).toBeNull();
    }
  });

  it("strips HTML appended after JPEG EOI", () => {
    const polyglot = concat(JPEG_SOI, encode("<html><script>alert(1)</script>"));
    const stripped = stripJpegTrailer(polyglot);
    expect(stripped.byteLength).toBe(JPEG_SOI.byteLength);
    expect(stripped[stripped.length - 1]).toBe(0xd9);
  });

  it("rejects image/HTML polyglots whose markup sits in the header window", async () => {
    const polyglot = concat(JPEG_SOI, encode("<html><script>alert(1)</script>"));
    const result = await hardenUploadBytes(polyglot, "image/jpeg", {
      reencodeImages: false,
    });
    expect(result.ok).toBe(false);
  });

  it("strips bytes after PNG IEND", () => {
    const png = Uint8Array.from(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      ),
    );
    const polyglot = concat(png, encode("<script>"));
    const stripped = stripPngTrailer(polyglot);
    expect(stripped.byteLength).toBe(png.byteLength);
  });

  it("locks document file CSP against inline script", () => {
    const headers = Object.fromEntries(
      documentFileSecurityHeaderEntries().map((row) => [row.key, row.value]),
    );
    expect(headers["Content-Security-Policy"]).toMatch(/script-src 'none'/);
    expect(headers["Content-Security-Policy"]).toMatch(/frame-ancestors 'self'/);
  });
});
