import { describe, expect, it } from "vitest";

import {
  extractTeilegutachtenAuflagenFromText,
  mergeTeilegutachtenAuflagen,
} from "@/lib/ocr/teilegutachten-auflagen-from-text";

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
Durch die vorgenommene Änderung erlischt die Betriebserlaubnis des Fahrzeuges, wenn nicht unverzüglich die gemäß StVZO § 19 Abs. 3 vorgeschriebene Änderungsabnahme durchgeführt und bestätigt wird oder festgelegte Auflagen nicht eingehalten werden !
Nach der Durchführung der technischen Änderung ist das Fahrzeug unter Vorlage des vorliegenden Teilegutachtens unverzüglich einem amtlich anerkannten Sachverständigen vorzuführen.

Einhaltung von Hinweisen und Auflagen:
Die unter III. und IV. aufgeführten Hinweise und Auflagen sind dabei zu beachten.

Mitführen von Dokumenten:
Nach der durchgeführten Abnahme ist der Nachweis mit den Fahrzeugpapieren mitzuführen.

Berichtigung der Fahrzeugpapiere:
Die Berichtigung der Fahrzeugpapiere durch die zuständige Zulassungsbehörde ist zu beantragen.
Weitere Festlegungen sind der Bestätigung der ordnungsgemäßen Änderung zu entnehmen.

Kennzeichnung:
Aufdruck auf den Federwindungen
`.trim();

const IV_STRUCTURED_TGA = `
Teilegutachten nach § 19 Abs. 3 StVZO

III. Hinweise für den Fahrzeughalter
Allgemeiner Hinweis.

IV. Hinweise und Auflagen
IV.1. Auflagen für den Hersteller / Einbaubetrieb:
1. Die Scheinwerfereinstellung ist zu überprüfen.
2. Die Federn müssen beim völligen Ausfedern des Fahrzeugs in axialer Richtung
 spielfrei sein.
3. Nach erfolgter Umrüstung sind die Fahrzeuge zu vermessen.
4. Bei Fahrzeugen mit lastabhängigem Bremsdruckregler ist dieser auf das Leerniveau
 neu einzustellen (gemäß Herstellerangabe).
IV.2. Hinweise und Auflagen zum Anbau: ./.
IV.3. Hinweise und Auflagen für die Änderungsabnahme:
1. Siehe IV.1.
2. Die zulässige Hinterachslast ist auf 730 kg zu begrenzen.
IV.4. Hinweise und Auflagen für den Fahrzeughalter:
1. Die Verwendbarkeit von Schneeketten wurde nicht geprüft.
2. Die verminderte Bodenfreiheit ist zu beachten.

Kennzeichnung:
Aufdruck
`.trim();

describe("extractTeilegutachtenAuflagenFromText", () => {
  it("extracts all IV. Auflagen sections with headings and body text", () => {
    const auflagen = extractTeilegutachtenAuflagenFromText(ROVER_LIKE_TGA);

    expect(auflagen).not.toBeNull();
    expect(auflagen!.length).toBeGreaterThanOrEqual(4);
    expect(auflagen!.some((item) => item.includes("Unverzügliche Durchführung"))).toBe(
      true,
    );
    expect(auflagen!.some((item) => item.includes("Mitführen von Dokumenten:"))).toBe(
      true,
    );
    expect(auflagen!.some((item) => item.includes("Weitere Festlegungen sind"))).toBe(
      true,
    );
  });

  it("extracts IV. Hinweise und Auflagen subsections verbatim", () => {
    const auflagen = extractTeilegutachtenAuflagenFromText(IV_STRUCTURED_TGA);

    expect(auflagen).toHaveLength(4);
    expect(auflagen![0]).toContain("IV.1.");
    expect(auflagen![0]).toContain("1. Die Scheinwerfereinstellung");
    expect(auflagen![0]).toContain("4. Bei Fahrzeugen mit lastabhängigem Bremsdruckregler");
    expect(auflagen![1]).toContain("IV.2.");
    expect(auflagen![1]).toContain("./.");
    expect(auflagen![3]).toContain("IV.4.");
    expect(auflagen![3]).toContain("Schneeketten");
  });

  it("extracts simple inline Auflagen lines", () => {
    const auflagen = extractTeilegutachtenAuflagenFromText(`
Teilegutachten
Verwendungsbereich: Mazda RX-8
Auflagen: Sichtprüfung der Befestigungspunkte.
Kennzeichnung: Aufdruck
    `.trim());

    expect(auflagen).toEqual(["Sichtprüfung der Befestigungspunkte."]);
  });
});

describe("mergeTeilegutachtenAuflagen", () => {
  it("keeps heuristic sections missing from the LLM payload", () => {
    const merged = mergeTeilegutachtenAuflagen(
      ["Sichtprüfung der Befestigungspunkte."],
      extractTeilegutachtenAuflagenFromText(ROVER_LIKE_TGA),
    );

    expect(merged!.length).toBeGreaterThan(1);
    expect(merged!.some((item) => item.includes("Mitführen von Dokumenten:"))).toBe(
      true,
    );
  });
});
