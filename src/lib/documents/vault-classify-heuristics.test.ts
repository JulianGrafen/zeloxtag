import { describe, expect, it } from "vitest";

import {
  inferVaultClassificationFromText,
  resolveVaultReviewDefaults,
} from "@/lib/documents/vault-classify-heuristics";

describe("vault classify heuristics", () => {
  it("detects Teilegutachten from embedded PDF text", () => {
    expect(
      inferVaultClassificationFromText(
        "Teilegutachten Nr. 14-TG-0892\n§ 19 Abs. 3 StVZO\nArt der Umrüstung: KW V3 Gewindefahrwerk",
      ),
    ).toMatchObject({
      documentKind: "teilegutachten",
      title: "KW V3 Gewindefahrwerk",
      category: "FAHRWERK",
    });
  });

  it("provides save-ready defaults when LLM classify fails", () => {
    expect(
      resolveVaultReviewDefaults({
        classification: null,
        fileName: "scan.pdf",
        embeddedHint: {
          title: "Teilegutachten",
          category: "SONSTIGES",
          documentKind: "teilegutachten",
        },
      }),
    ).toEqual({
      title: "Teilegutachten",
      category: "SONSTIGES",
      documentKind: "teilegutachten",
    });
  });

  it("never returns an empty title", () => {
    expect(
      resolveVaultReviewDefaults({
        classification: null,
        fileName: "x.pdf",
        embeddedHint: null,
      }).title.length,
    ).toBeGreaterThan(0);
  });
});
