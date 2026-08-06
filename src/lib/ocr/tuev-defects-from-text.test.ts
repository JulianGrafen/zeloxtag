import { describe, expect, it } from "vitest";

import {
  defectsListFromTuevDefectRows,
  extractTuevDefectsFromText,
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

describe("extractTuevDefectsFromText", () => {
  it("splits dense HU/AU Mängel into individual rows with Prüfpunkt and EM/GM", () => {
    const rows = extractTuevDefectsFromText(DENSE_DEFECTS_SAMPLE);
    expect(rows).not.toBeNull();
    expect(rows!.length).toBeGreaterThanOrEqual(10);

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          checkpoint: "4.7.1b",
          description: "Prüfplakette wurde nicht zugeteilt",
          severity: null,
        }),
        expect.objectContaining({
          description: expect.stringContaining("Kennzeichenbeleuchtung"),
          severity: "EM",
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
  });

  it("parses simple Festgestellte Mängel lists", () => {
    const rows = extractTuevDefectsFromText(`
Festgestellte Mängel:
Bremsbelag nahe Verschleißgrenze (GM)
Scheibenwischer vorne abgenutzt (GM)
Ergebnis: geringfügige Mängel
    `);

    expect(rows).toEqual([
      {
        checkpoint: null,
        description: "Bremsbelag nahe Verschleißgrenze",
        severity: "GM",
      },
      {
        checkpoint: null,
        description: "Scheibenwischer vorne abgenutzt",
        severity: "GM",
      },
    ]);
  });

  it("builds legacy defectsList strings from structured rows", () => {
    const rows = extractTuevDefectsFromText(DENSE_DEFECTS_SAMPLE);
    const list = defectsListFromTuevDefectRows(rows);
    expect(list?.[0]).toContain("[4.7.1b]");
    expect(list?.some((item) => item.includes("(EM)"))).toBe(true);
  });
});
