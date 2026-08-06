import { describe, expect, it } from "vitest";

import {
  groupTeilegutachtenAuflagen,
  isAuflageSectionHeading,
  splitAuflageHeading,
} from "@/lib/validations/teilegutachten-auflagen";

describe("isAuflageSectionHeading", () => {
  it("recognizes TGA section titles", () => {
    expect(
      isAuflageSectionHeading(
        "Berichtigung der Fahrzeugpapiere:",
      ),
    ).toBe(true);
    expect(
      isAuflageSectionHeading(
        "Unverzügliche Durchführung und Bestätigung der Änderungsabnahme:",
      ),
    ).toBe(true);
  });

  it("rejects body sentences", () => {
    expect(
      isAuflageSectionHeading(
        "Durch die vorgenommene Änderung erlischt die Betriebserlaubnis des Fahrzeuges, wenn nicht unverzüglich die gemäß StVZO § 19 Abs. 3 vorgeschriebene Änderungsabnahme durchgeführt und bestätigt wird oder festgelegte Auflagen nicht eingehalten werden !",
      ),
    ).toBe(false);
  });
});

describe("groupTeilegutachtenAuflagen", () => {
  it("merges headings with following paragraphs", () => {
    const raw = [
      "Unverzügliche Durchführung und Bestätigung der Änderungsabnahme:",
      "Durch die vorgenommene Änderung erlischt die Betriebserlaubnis des Fahrzeuges, wenn nicht unverzüglich die gemäß StVZO § 19 Abs. 3 vorgeschriebene Änderungsabnahme durchgeführt und bestätigt wird oder festgelegte Auflagen nicht eingehalten werden !",
      "Nach der Durchführung der technischen Änderung ist das Fahrzeug unter Vorlage des vorliegenden Teilegutachtens unverzüglich einem amtlich anerkannten Sachverständigen oder Prüfer einer Technischen Prüfstelle oder einem Prüfingenieur einer amtlich anerkannten Überwachungsorganisation zur Durchführung und Bestätigung der vorgeschriebenen Änderungsabnahme vorzuführen.",
      "Einhaltung von Hinweisen und Auflagen:",
      "Die unter III. und IV. aufgeführten Hinweise und Auflagen sind dabei zu beachten.",
      "Mitführen von Dokumenten:",
      "Nach der durchgeführten Abnahme ist der Nachweis mit der Bestätigung über die Änderungsabnahme mit den Fahrzeugpapieren mitzuführen und zuständigen Personen auf Verlangen vorzuzeigen; dies entfällt nach erfolgter Berichtigung der Fahrzeugpapiere.",
      "Berichtigung der Fahrzeugpapiere:",
      "Die Berichtigung der Fahrzeugpapiere ( Fahrzeugbrief und Fahrzeugschein, Betriebserlaubnis nach § 18 Abs. 5 StVZO oder Anhängerverzeichnis ) durch die zuständige Zulassungsbehörde ist durch den Fahrzeughalter entsprechend der Festlegung in der Bestätigung der ordnungsgemäßen Änderung zu beantragen.",
      "Weitere Festlegungen sind der Bestätigung der ordnungsgemäßen Änderung zu entnehmen.",
    ];

    const grouped = groupTeilegutachtenAuflagen(raw);

    expect(grouped).toHaveLength(4);
    expect(grouped[0]).toContain(
      "Unverzügliche Durchführung und Bestätigung der Änderungsabnahme:",
    );
    expect(grouped[0]).toContain("Durch die vorgenommene Änderung");
    expect(grouped[0]).toContain("Nach der Durchführung der technischen Änderung");
    expect(grouped[3]).toContain("Berichtigung der Fahrzeugpapiere:");
    expect(grouped[3]).toContain("Weitere Festlegungen sind");
  });

  it("preserves IV.1–IV.n subsections with numbered lists verbatim", () => {
    const body = `
IV.1. Auflagen für den Hersteller / Einbaubetrieb:
1. Die Scheinwerfereinstellung ist zu überprüfen.
2. Die Federn müssen beim völligen Ausfedern des Fahrzeugs in axialer Richtung
 spielfrei sein.
IV.2. Hinweise und Auflagen zum Anbau: ./.
IV.3. Hinweise und Auflagen für die Änderungsabnahme:
1. Siehe IV.1.
2. Die zulässige Hinterachslast ist auf 730 kg zu begrenzen.
IV.4. Hinweise und Auflagen für den Fahrzeughalter:
1. Die Verwendbarkeit von Schneeketten wurde nicht geprüft.
2. Die verminderte Bodenfreiheit ist zu beachten.
    `.trim();

    const grouped = groupTeilegutachtenAuflagen([body]);

    expect(grouped).toHaveLength(4);
    expect(grouped[0]).toContain("IV.1.");
    expect(grouped[0]).toContain("1. Die Scheinwerfereinstellung");
    expect(grouped[0]).toContain("2. Die Federn müssen");
    expect(grouped[1]).toContain("IV.2.");
    expect(grouped[1]).toContain("./.");
    expect(grouped[3]).toContain("Schneeketten");
  });
});

describe("splitAuflageHeading", () => {
  it("splits grouped section into heading and body", () => {
    const grouped = groupTeilegutachtenAuflagen([
      "Mitführen von Dokumenten:",
      "Nach der durchgeführten Abnahme ist der Nachweis mitzuführen.",
    ])[0]!;

    expect(splitAuflageHeading(grouped)).toEqual({
      heading: "Mitführen von Dokumenten",
      body: "Nach der durchgeführten Abnahme ist der Nachweis mitzuführen.",
    });
  });
});
