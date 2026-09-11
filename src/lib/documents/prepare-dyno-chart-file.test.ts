import { describe, expect, it, vi } from "vitest";

vi.mock("browser-image-compression", () => ({
  default: vi.fn(async (file: File) => file),
}));

import {
  DYNO_PDF_MAX_BYTES,
  DocumentCompressionError,
  prepareDynoChartFile,
} from "./document-compression";

function pdfBytes(size = 128): Uint8Array {
  const header = new TextEncoder().encode("%PDF-1.4\n%%EOF\n");
  const out = new Uint8Array(size);
  out.set(header);
  return out;
}

function makeFile(
  bytes: Uint8Array,
  name: string,
  type = "",
): File {
  return new File([bytes as BlobPart], name, { type, lastModified: Date.now() });
}

describe("prepareDynoChartFile", () => {
  it("materializes PDF bytes with a stable application/pdf type", async () => {
    const bytes = pdfBytes();
    const input = makeFile(bytes, "dyno", "application/octet-stream");

    const result = await prepareDynoChartFile(input);

    expect(result.kind).toBe("pdf");
    expect(result.file.type).toBe("application/pdf");
    expect(result.file.name).toBe("dyno.pdf");
    expect(result.file.size).toBe(bytes.byteLength);

    const roundTrip = new Uint8Array(await result.file.arrayBuffer());
    expect(roundTrip.slice(0, 4)).toEqual(
      new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    );
  });

  it("detects PDFs without a .pdf extension via magic bytes", async () => {
    const bytes = pdfBytes();
    const input = makeFile(bytes, "scan-12345", "");

    const result = await prepareDynoChartFile(input);

    expect(result.kind).toBe("pdf");
    expect(result.file.name).toBe("scan-12345.pdf");
  });

  it("rejects PDFs above the dyno upload cap", async () => {
    const bytes = pdfBytes(DYNO_PDF_MAX_BYTES + 1);
    const input = makeFile(bytes, "large.pdf", "application/pdf");

    await expect(prepareDynoChartFile(input)).rejects.toMatchObject({
      name: "DocumentCompressionError",
      message: expect.stringContaining("PDF zu groß"),
    } satisfies Partial<DocumentCompressionError>);
  });
});
