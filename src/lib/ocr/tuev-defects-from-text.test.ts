import { describe, expect, it } from "vitest";

import {
  defectsListFromTuevDefectRows,
  extractTuevDefectsFromText,
  parseTuevDefectLine,
} from "@/lib/ocr/tuev-defects-from-text";

const DENSE_DEFECTS_SAMPLE = `
Untersuchungsbericht HU/AU
TÜV Süd
(6) Ihr Fahrzeug weist folgende Mängel auf: *4.7.1b
Prüfplakette wurde nicht zugeteilt
Leuchten, Kennzeichenbeleuchtung ohne Funktion (EM) Leuchten, Begrenzungsleuchte (Standlicht) links eine Seite ohne Funktion (GM) Leuchten, Fahrtrichtungsanzeiger hinten links und rechts Farbbeschichtung der Lichtquelle abgelöst (EM)
Abgasanlage mitte Wärmeschutz Befestigung mangelhaft (EM)
4.2.3a
4.4.3
*5.3.1b Federung, Feder 2. Achse rechts gebrochen (EM) DF6.2.6 Sitze, Sitzbank fehlt (EM) *6.1.2a
*D7.1.1a Sicherheitsgurt, Gurtschloss 2. Sitzreihe links fehlt (EM)
*D7.1.1a Sicherheitsgurt, Gurtschloss 2. Sitzreihe mitte fehlt (EM) *D7.1.1a Sicherheitsgurt, Gurtschloss 2. Sitzreihe rechts fehlt (EM)
7.1.2a Sicherheitsgurt 2. Sitzreihe links fehlt (EM)
*7.1.2a Sicherheitsgurt 2. Sitzreihe mitte fehlt (EM)
*7.1.2a Sicherheitsgurt 2. Sitzreihe rechts fehlt (EM)
nächste HU: 05/2028
`.trim();

const LEGAL_FOOTER_SAMPLE = `
(6) Ihr Fahrzeug weist folgende Mängel auf:
*4.7.1b Prüfplakette wurde nicht zugeteilt
5.3.1b Federung, Feder 2. Achse rechts gebrochen (EM)
Bitte beachten Sie, dass nach §23 StVO und §31 StVZO Halter und Fahrer für die unverzügliche Beseitigung aller Mängel verantwortlich sind.
Lassen Sie bitte die festgestellten Mängel von einer Fachwerkstatt beheben.
185778677 2
Die Nachprüfung der Beseitigung aller Mängel kann bis spätestens 27.04.2025 erfolgen.
Bitte legen Sie dafür diesen Untersuchungsbericht wieder vor.
Wir bedanken uns für Ihr in uns gesetztes Vertrauen und freuen uns darauf, Sie zur nächsten Untersuchung erneut begrüßen zu dürfen.
(9) Im Auftrag der GTÜ mbH
00813001 Dipl .- Ing. Guido Härtwig
Ingenieurbüro Härtwig
Dechant-Blum Straße 9
53332 Bornheim
Tel: 022279099502
10051800
`.trim();

const UMA_PREAMBLE_SAMPLE = `
Untersuchung des Motormanagement-/Abgasreinigungssystems (UMA)
vom 27.03.2025, Kontrollnummer: NW 6-05-0548-63
Prüfplakette wurde nicht zugeteilt
Sehr geehrte Kundin, sehr geehrter Kunde,
wir haben Ihr Fahrzeug nach §29 StVZO untersucht.
| | (6) Ihr Fahrzeug | weist folgende Mängel auf: | | | |
*4.7.1b Prüfplakette wurde nicht zugeteilt
Leuchten, Kennzeichenbeleuchtung ohne Funktion (EM)
5.3.1b Federung, Feder 2. Achse rechts gebrochen (EM)
Ergebnis: erhebliche Mängel
`.trim();

describe("extractTuevDefectsFromText", () => {
  it("splits dense HU/AU Mängel into individual rows with Prüfpunkt and EM/GM", () => {
    const rows = extractTuevDefectsFromText(DENSE_DEFECTS_SAMPLE);
    expect(rows).not.toBeNull();
    expect(rows!.length).toBeGreaterThanOrEqual(8);

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          checkpoint: "4.7.1b",
          description: "Prüfplakette wurde nicht zugeteilt",
          severity: null,
        }),
        expect.objectContaining({
          checkpoint: "5.3.1b",
          description: expect.stringContaining("Feder 2. Achse rechts gebrochen"),
          severity: "EM",
        }),
        expect.objectContaining({
          checkpoint: "DF6.2.6",
          description: expect.stringContaining("Sitzbank fehlt"),
          severity: "EM",
        }),
        expect.objectContaining({
          checkpoint: "D7.1.1a",
          description: expect.stringContaining("Sitzreihe links fehlt"),
          severity: "EM",
        }),
      ]),
    );

    for (const row of rows!) {
      expect(row.description.length).toBeGreaterThan(2);
    }

    expect(
      rows!.some((row) => row.description.includes("Kennzeichenbeleuchtung")),
    ).toBe(true);
  });

  it("ignores legal footer and address boilerplate after the Mängel list", () => {
    const rows = extractTuevDefectsFromText(LEGAL_FOOTER_SAMPLE);
    expect(rows).not.toBeNull();
    expect(rows!.length).toBe(2);
    expect(rows!.every((row) => row.checkpoint)).toBe(true);
    expect(
      rows!.some((row) => row.description.includes("Bitte beachten")),
    ).toBe(false);
    expect(rows!.some((row) => row.description.includes("GTÜ"))).toBe(false);
    expect(rows!.some((row) => row.description.includes("Bornheim"))).toBe(
      false,
    );
  });

  it("skips UMA preamble and only extracts numbered Prüfpunkte after the Mängel header", () => {
    const rows = extractTuevDefectsFromText(UMA_PREAMBLE_SAMPLE);
    expect(rows).not.toBeNull();
    expect(rows!.length).toBeGreaterThanOrEqual(2);
    expect(
      rows!.some((row) => row.description.includes("Sehr geehrte")),
    ).toBe(false);
    expect(
      rows!.some((row) => row.description.includes("Motormanagement")),
    ).toBe(false);
    expect(
      rows!.some((row) => row.checkpoint === "4.7.1b"),
    ).toBe(true);
  });

  it("extracts Mängel under Punkt 6 header (6. Festgestellte Mängel)", () => {
    const rows = extractTuevDefectsFromText(`
6. Festgestellte Mängel
Bremsbelag nahe Verschleißgrenze (GM)
Scheibenwischer vorne abgenutzt (GM)
Ergebnis: geringfügige Mängel
    `);

    expect(rows).not.toBeNull();
    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          checkpoint: null,
          description: "Bremsbelag nahe Verschleißgrenze",
          severity: "GM",
        }),
        expect.objectContaining({
          checkpoint: null,
          description: "Scheibenwischer vorne abgenutzt",
          severity: "GM",
        }),
      ]),
    );
  });

  it("extracts Mängel with EM/GM but without Prüfpunkt numbers", () => {
    const rows = extractTuevDefectsFromText(`
Festgestellte Mängel:
Bremsbelag nahe Verschleißgrenze (GM)
Scheibenwischer vorne abgenutzt (GM)
Ergebnis: geringfügige Mängel
    `);

    expect(rows).not.toBeNull();
    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          checkpoint: null,
          description: "Bremsbelag nahe Verschleißgrenze",
          severity: "GM",
        }),
        expect.objectContaining({
          checkpoint: null,
          description: "Scheibenwischer vorne abgenutzt",
          severity: "GM",
        }),
      ]),
    );
  });

  it("extracts Mängelliste header with numbered Prüfpunkte", () => {
    const rows = extractTuevDefectsFromText(`
Mängelliste:
4.2.1a Bremsbelag nahe Verschleißgrenze (GM)
    `);

    expect(rows).not.toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows![0]).toMatchObject({
      checkpoint: "4.2.1a",
      severity: "GM",
    });
  });

  it("extracts dot-separated Prüfpunkte with parentheses or colon separator", () => {
    const rows = extractTuevDefectsFromText(`
Festgestellte Mängel:
(4.2.1) Bremsbelag (GM)
1.3.2a: Reifenprofil (EM)
6.1.4 Scheinwerfer einstellen (GM)
    `);

    expect(rows).not.toBeNull();
    expect(rows).toHaveLength(3);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          checkpoint: "4.2.1",
          description: "Bremsbelag",
          severity: "GM",
        }),
        expect.objectContaining({
          checkpoint: "1.3.2a",
          description: "Reifenprofil",
          severity: "EM",
        }),
        expect.objectContaining({
          checkpoint: "6.1.4",
          description: "Scheinwerfer einstellen",
          severity: "GM",
        }),
      ]),
    );
  });

  it("parseTuevDefectLine extracts bracket-form dot-separated Prüfpunkte", () => {
    expect(parseTuevDefectLine("[4.2.1] Bremsbelag (GM)")).toMatchObject({
      checkpoint: "4.2.1",
      description: "Bremsbelag",
      severity: "GM",
    });
    expect(parseTuevDefectLine("1.3.2a Reifenprofil (EM)")).toMatchObject({
      checkpoint: "1.3.2a",
      description: "Reifenprofil",
      severity: "EM",
    });
  });

  it("does not treat bare Festgestellte Mängel lines without Prüfpunkt or EM/GM as defects", () => {
    const rows = extractTuevDefectsFromText(`
Festgestellte Mängel:
Bremsbelag nahe Verschleißgrenze
Scheibenwischer vorne abgenutzt
Ergebnis: geringfügige Mängel
    `);

    expect(rows).toBeNull();
  });

  it("does not match legal text mentioning Mängel without a list header", () => {
    const rows = extractTuevDefectsFromText(`
Bitte beachten Sie, dass nach §23 StVO Halter für die Beseitigung aller Mängel verantwortlich sind.
Lassen Sie bitte die festgestellten Mängel von einer Fachwerkstatt beheben.
    `);

    expect(rows).toBeNull();
  });

  it("builds legacy defectsList strings from structured rows", () => {
    const rows = extractTuevDefectsFromText(DENSE_DEFECTS_SAMPLE);
    const list = defectsListFromTuevDefectRows(rows);
    expect(list?.some((item) => item.includes("[4.7.1b]"))).toBe(true);
    expect(list?.some((item) => item.includes("(EM)"))).toBe(true);
  });
});
