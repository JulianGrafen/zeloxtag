import { describe, expect, it } from "vitest";

import {
  extractTeilegutachtenOwnerNotesFromText,
  mergeTeilegutachtenOwnerNotes,
  normalizeTeilegutachtenOwnerNotes,
} from "@/lib/ocr/teilegutachten-owner-notes-from-text";

const ROVER_LIKE_TGA = `
Teilegutachten nach § 19 Abs. 3 StVZO
Gutachten-Nr.: 14-00123-CP-GBM

I. Verwendungsbereich
Rover 75 · RJ · alle

II. Technische Daten
Federrate VA: 450 N/mm

III. Hinweise für den Fahrzeughalter

Vor dem Einbau ist das Fahrzeug auf einer ebenen Fläche abzustellen.
Der Fahrzeughalter hat den Einbau durch eine Fachwerkstatt durchführen zu lassen.

IV. Auflagen

Unverzügliche Durchführung und Bestätigung der Änderungsabnahme:
Durch die vorgenommene Änderung erlischt die Betriebserlaubnis des Fahrzeuges.

Kennzeichnung:
Aufdruck auf den Federwindungen
`.trim();

describe("extractTeilegutachtenOwnerNotesFromText", () => {
  it("extracts section III verbatim with line breaks", () => {
    const notes = extractTeilegutachtenOwnerNotesFromText(ROVER_LIKE_TGA);

    expect(notes).toContain(
      "Vor dem Einbau ist das Fahrzeug auf einer ebenen Fläche abzustellen.",
    );
    expect(notes).toContain(
      "Der Fahrzeughalter hat den Einbau durch eine Fachwerkstatt durchführen zu lassen.",
    );
    expect(notes).not.toContain("Unverzügliche Durchführung");
    expect(notes?.split("\n").length).toBeGreaterThanOrEqual(2);
  });

  it("preserves text without collapsing whitespace", () => {
    const normalized = normalizeTeilegutachtenOwnerNotes(
      "Zeile eins\n\nZeile zwei mit  doppelten  spaces",
    );

    expect(normalized).toBe("Zeile eins\n\nZeile zwei mit  doppelten  spaces");
  });
});

describe("mergeTeilegutachtenOwnerNotes", () => {
  it("keeps the longer owner-notes block", () => {
    const merged = mergeTeilegutachtenOwnerNotes(
      "Kurzer Hinweis.",
      extractTeilegutachtenOwnerNotesFromText(ROVER_LIKE_TGA),
    );

    expect(merged).toContain("Vor dem Einbau");
    expect(merged!.length).toBeGreaterThan("Kurzer Hinweis.".length);
  });
});
