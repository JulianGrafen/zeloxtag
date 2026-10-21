import { describe, expect, it } from "vitest";

import {
  DOCUMENT_DETAIL_TITLE_FONT_MIN_PX,
  DOCUMENT_DETAIL_TITLE_MAX_LINES,
  estimateDocumentDetailTitleFontPx,
} from "./document-detail-title-layout";

describe("estimateDocumentDetailTitleFontPx", () => {
  it("keeps max font size for short titles", () => {
    const px = estimateDocumentDetailTitleFontPx("KW V1 ABE", 400);
    expect(px).toBe(24);
  });

  it("shrinks font for long ABE-style designation", () => {
    const longAbe =
      "Spoiler vorne Carbon mit Typgenehmigung für BMW 3er E46 Limousine 2.0i 110 kW Baugenehmigung erforderlich";
    const px = estimateDocumentDetailTitleFontPx(
      longAbe,
      240,
      DOCUMENT_DETAIL_TITLE_MAX_LINES,
    );
    expect(px).toBeLessThan(24);
    expect(px).toBeGreaterThanOrEqual(DOCUMENT_DETAIL_TITLE_FONT_MIN_PX);
  });

  it("shrinks further on narrow width with trailing column", () => {
    const invoice =
      "Rechnung Werkstatt Müller & Söhne GmbH — Motorüberholung inkl. Dichtungen und Arbeitszeit";
    const wide = estimateDocumentDetailTitleFontPx(invoice, 400);
    const narrow = estimateDocumentDetailTitleFontPx(invoice, 200);
    expect(narrow).toBeLessThanOrEqual(wide);
  });

  it("never goes below minimum font size", () => {
    const extreme = "Wort ".repeat(80);
    const px = estimateDocumentDetailTitleFontPx(extreme, 180);
    expect(px).toBe(DOCUMENT_DETAIL_TITLE_FONT_MIN_PX);
  });
});
