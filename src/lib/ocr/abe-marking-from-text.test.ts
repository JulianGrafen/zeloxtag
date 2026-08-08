import { describe, expect, it } from "vitest";

import {
  coerceAbeMarkingText,
  mergeAbeMarkingText,
  normalizeAbeMarkingText,
} from "@/lib/ocr/abe-marking-from-text";

describe("abe-marking-from-text", () => {
  it("keeps verbatim Kennzeichnung paragraph", () => {
    expect(
      normalizeAbeMarkingText(
        "Kennzeichnung:\nDie KBA-Nummer ist auf der Innenseite der Speichen eingeprägt.",
      ),
    ).toBe(
      "Die KBA-Nummer ist auf der Innenseite der Speichen eingeprägt.",
    );
  });

  it("preserves table rows as lines", () => {
    expect(
      normalizeAbeMarkingText(
        "Art der Kennzeichnung: Prüfplakette\nNummer: e1*47656",
      ),
    ).toBe("Art der Kennzeichnung: Prüfplakette\nNummer: e1*47656");
  });

  it("merges toward the longer verbatim block", () => {
    expect(
      mergeAbeMarkingText(
        "Prüfplakette",
        "Art der Kennzeichnung: Prüfplakette\nNummer: e1*47656",
      ),
    ).toBe("Art der Kennzeichnung: Prüfplakette\nNummer: e1*47656");
  });

  it("coerces structured table rows from LLM", () => {
    expect(
      coerceAbeMarkingText({
        rows: [
          ["Art der Kennzeichnung", "Eingegossen"],
          ["Nummer", "14-00123"],
        ],
      }),
    ).toBe("Art der Kennzeichnung: Eingegossen\nNummer: 14-00123");
  });
});
