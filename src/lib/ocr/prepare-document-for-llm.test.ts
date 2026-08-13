import { describe, expect, it } from "vitest";

import { rasterizePdfPagesForLlm } from "@/lib/ocr/prepare-document-for-llm";

/** Minimal valid single-page PDF (blank A4). */
const MINIMAL_PDF = Buffer.from(
  `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000101 00000 n 
trailer<</Size 4/Root 1 0 R>>
startxref
178
%%EOF`,
  "utf8",
);

describe("rasterizePdfPagesForLlm", () => {
  it("rasterizes a PDF via pdf.js when Sharp cannot decode PDF input", async () => {
    const pages = await rasterizePdfPagesForLlm(MINIMAL_PDF, 1, 110);
    expect(pages).toHaveLength(1);
    expect(pages[0]!.byteLength).toBeGreaterThan(500);
    expect(pages[0]!.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });
});
