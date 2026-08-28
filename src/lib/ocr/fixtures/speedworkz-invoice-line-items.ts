/**
 * Ground truth: SPEEDWORKZ Rechnung 2026-06-27993 (09.06.2026).
 * Section layout: Arbeitswerte | Ersatzteile | Sonstige Kosten.
 */

export const SPEEDWORKZ_OCR_TEXT = `
SPEEDWORKZ GMBH
Rechnung Nr. 2026-06-27993
Datum 09.06.2026
Fahrzeug BMW 5er 530D TOURING
KM-Stand 299760

Arbeitswerte
Beschreibung Rab. % Art PG Std. Preis-€
Motor wird heiß lt. Kunde Thermost wurde erneuert 4 0,50 Std. 46,22
Thermostat gebrochen
Wasserflansch undicht
Thermostat und Wasserschlauch erneuern 4 1,80 166,37
Kühlmitteltemp.sensor prüfen und erneuern 4 0,50 46,22

Ersatzteile
Anzahl Einheit Beschreibung Rab. % Einzelpreis Preis-€
1 Stück Wasserschlauch 65,12 65,12
1 Stück Thermostat 70,83 70,83
4 Stück Kühlerfrostschutz Blau/Rot 6,50 26,00
1 Stück Sensor, Kühlmitteltemperatur 30,00 41,04 28,73

Sonstige Kosten
Anzahl Beschreibung Einzelpreis Preis-€
1 Fracht 5,00 5,00

Zwischensummen
Mechanik 2,80 Std 92,43 258,81
Ersatzteile 190,68
Sonstige Kosten 5,00
Positionssumme 454,49

Endsummen
Netto Summe 454,49 €
MwSt. 19,0 % 86,35 €
Endpreis 540,84 €
`.trim();

export const SPEEDWORKZ_EXPECTED_LINE_ITEMS: Array<{ label: string; amount: number }> =
  [
    { label: "Motor wird heiß lt. Kunde Thermost wurde erneuert", amount: 46.22 },
    { label: "Thermostat und Wasserschlauch erneuern", amount: 166.37 },
    { label: "Kühlmitteltemp.sensor prüfen und erneuern", amount: 46.22 },
    { label: "Wasserschlauch", amount: 65.12 },
    { label: "Thermostat", amount: 70.83 },
    { label: "Kühlerfrostschutz Blau/Rot", amount: 26.0 },
    { label: "Sensor, Kühlmitteltemperatur", amount: 28.73 },
    { label: "Fracht", amount: 5.0 },
  ];

export const SPEEDWORKZ_NET_SUM = 454.49;
export const SPEEDWORKZ_VAT = 86.35;
export const SPEEDWORKZ_GROSS_TOTAL = 540.84;

/**
 * Camera-style Azure OCR: amounts on the next line, diagnostic notes without €,
 * wrapped parts description (Kühlerfrostschutz / Blau/Rot).
 */
export const SPEEDWORKZ_CAMERA_OCR_TEXT = `
SPEEDWORKZ GMBH
Rechnung Nr. 2026-06-27993
Datum 09.06.2026

Arbeitswerte
Beschreibung Rab. % Art PG Std. Preis-€
Motor wird heiß lt. Kunde Thermostat wurde erneuert
46,22
Thermostat gebrochen
Wasserflansch undicht
Thermostat und Wasserschlauch erneuern
166,37
Kühlmitteltemp.sensor prüfen und erneuern 4 0,50 46,22

Ersatzteile
Anzahl Einheit Beschreibung Rab. % Einzelpreis Preis-€
1 Stück Wasserschlauch 65,12 65,12
1 Stück Thermostat 70,83 70,83
4 Stück Kühlerfrostschutz 6,50 26,00
Blau/Rot
1 Stück Sensor, Kühlmitteltemperatur 30,00 41,04 28,73

Sonstige Kosten
Anzahl Beschreibung Einzelpreis Preis-€
1 Fracht 5,00 5,00

Zwischensummen
Mechanik 2,80 Std 92,43 258,81
Ersatzteile 190,68
Sonstige Kosten 5,00
Positionssumme 454,49

Endsummen
Netto Summe 454,49 €
MwSt. 19,0 % 86,35 €
Endpreis 540,84 €
`.trim();

/**
 * Camera Azure with one table cell per line: Art, Std/Einzelpreis, then Preis-€.
 * Prejoin must keep the last amount, not 0,50 Std or 6,50 EP.
 */
export const SPEEDWORKZ_CAMERA_COLUMN_OCR_TEXT = `
SPEEDWORKZ GMBH
Rechnung Nr. 2026-06-27993
Datum 09.06.2026

Arbeitswerte
Beschreibung Rab. % Art PG Std. Preis-€
Motor wird heiß lt. Kunde Thermostat wurde erneuert
4
0,50
Std.
46,22
Thermostat gebrochen
Wasserflansch undicht
Thermostat und Wasserschlauch erneuern
4
1,80
166,37
Kühlmitteltemp.sensor prüfen und erneuern
4
0,50
46,22

Ersatzteile
Anzahl Einheit Beschreibung Rab. % Einzelpreis Preis-€
1 Stück Wasserschlauch
65,12
65,12
1 Stück Thermostat
70,83
70,83
4 Stück Kühlerfrostschutz
6,50
26,00
Blau/Rot
1 Stück Sensor, Kühlmitteltemperatur
30,00
41,04
28,73

Sonstige Kosten
Anzahl Beschreibung Einzelpreis Preis-€
1 Fracht
5,00
5,00

Zwischensummen
Mechanik 2,80 Std 92,43 258,81
Ersatzteile 190,68
Sonstige Kosten 5,00
Positionssumme 454,49

Endsummen
Netto Summe 454,49 €
MwSt. 19,0 % 86,35 €
Endpreis 540,84 €
Gesamt
540,84
`.trim();

/** LLM Extract & Compute raw strings for the same invoice. */
export const SPEEDWORKZ_LLM_RAW_LINE_ITEMS = [
  {
    label: "Motor wird heiß lt. Kunde Thermost wurde erneuert",
    menge: "0,50 Std",
    einzelpreis: null,
    gesamtpreis: "46,22 €",
  },
  {
    label: "Thermostat und Wasserschlauch erneuern",
    menge: "1,80 Std",
    einzelpreis: null,
    gesamtpreis: "166,37 €",
  },
  {
    label: "Kühlmitteltemp.sensor prüfen und erneuern",
    menge: "0,50 Std",
    einzelpreis: null,
    gesamtpreis: "46,22 €",
  },
  {
    label: "Wasserschlauch",
    menge: "1 Stück",
    einzelpreis: "65,12 €",
    gesamtpreis: "65,12 €",
  },
  {
    label: "Thermostat",
    menge: "1 Stück",
    einzelpreis: "70,83 €",
    gesamtpreis: "70,83 €",
  },
  {
    label: "Kühlerfrostschutz Blau/Rot",
    menge: "4 Stück",
    einzelpreis: "6,50 €",
    gesamtpreis: "26,00 €",
  },
  {
    label: "Sensor, Kühlmitteltemperatur",
    menge: "1 Stück",
    einzelpreis: "41,04 €",
    gesamtpreis: "28,73 €",
  },
  {
    label: "Fracht",
    menge: "1",
    einzelpreis: "5,00 €",
    gesamtpreis: "5,00 €",
  },
];
