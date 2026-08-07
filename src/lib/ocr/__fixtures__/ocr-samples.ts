/**
 * Deterministic mock OCR texts for pre-deploy extraction quality gates.
 * Keep samples realistic (German workshop / Prüfstellen wording).
 */

export const OCR_SAMPLES = {
  workshopInvoiceWithTuevMention: `
Rechnung RE-2026-0312
Auto Werkstatt Süd GmbH
Kunde: Max Mustermann

Pos. Beschreibung                  Betrag
1    Arbeitslohn Sportfedern      120,00 €
2    Sportfedern H&R               480,00 €
3    inkl. TÜV-Abnahme empfohlen     0,00 €

Netto                             600,00 €
MwSt 19%                          114,00 €
Rechnungsbetrag / Zahlbetrag      714,00 €
DEKRA Standort in der Nähe
`.trim(),

  oilChangeInvoice: `
Rechnung
Mazda Zentrum Stuttgart
Ölwechsel 5W-30                    89,00 €
Ölfilter                           18,50 €
Arbeitslohn                        45,00 €
MwSt 19%                           28,98 €
Summe                             181,48 €
Kilometerstand: 67.210 km
`.trim(),

  brakeRepairInvoice: `
Kfz-Rechnung RE-8841
Bremsenreparatur Vorderachse
Bremsbeläge Austausch             180,00 €
Bremsscheiben                     220,00 €
Arbeitslohn                       160,00 €
MwSt 19%                          106,40 €
Zahlbetrag                        666,40 €
`.trim(),

  teilegutachten: `
Teilegutachten nach § 19 Abs. 3 StVZO
Prüforganisation: TÜV Süd
Gutachten-Nr.: TG-19-3-8821

Verwendungsbereich:
Gültig für Mazda RX-8 (SE3P) in Verbindung mit der serienmäßigen
Frontschürze. Montage ausschließlich nach Herstellervorgabe.

Sofortige Abnahme erforderlich.
Auflagen: Sichtprüfung der Befestigungspunkte.
`.trim(),

  einzelabnahme: `
Einzelabnahme / Änderungsabnahme nach § 21 StVZO
Amtlich anerkannter Sachverständiger: Max Mustermann
Bericht-Nr.: EA-2026-0142

Feld 22:
Sportfedern H&R eingebaut, Achsvermessung durchgeführt.
Eintragung in die Fahrzeugpapiere erforderlich.
`.trim(),

  egbe: `
EG-Betriebserlaubnis / ECE-Typgenehmigung
E-Prüfzeichen: e1*2007/46*0123*01
Bauteilgruppe: Beleuchtung
Genehmigungsgegenstand: LED Scheinwerfer
`.trim(),

  classicAbe: `
Allgemeine Betriebserlaubnis
ABE KBA 91234
Herstellerzeichen: AutoExe
Verwendungsbereich / Freigaben:
Mazda RX-8 (SE3P), BMW 3er (E90), VW Golf VII
184
HSN 0005
Auflagen:
1. Montage nur nach Einbauanleitung.
2. Sichtprüfung nach dem Einbau.
`.trim(),

  tuevReportPass: `
Untersuchungsbericht nach § 29 StVZO
Hauptuntersuchung HU/AU
Prüforganisation: TÜV Rheinland
Untersuchungsdatum: 12.03.2026
Kilometerstand: 85.400 km
Ergebnis: ohne erhebliche Mängel
Prüfplakette erteilt
nächste HU: 05/2028
Vorgangs-Nr.: HU-2026-991
`.trim(),

  tuevReportMinorDefects: `
Untersuchungsbericht
Hauptuntersuchung HU / AU
DEKRA Automobil GmbH
Datum: 01.07.2026
km-Stand: 120.500 km
geringfügige Mängel
(6) Ihr Fahrzeug weist folgende Mängel auf:
4.2.1a Bremsbelag nahe Verschleißgrenze (GM)
4.3.2b Scheibenwischer vorne abgenutzt (GM)
nächste HU: 07/2028
`.trim(),

  tuevReportHeaderKmStand: `
Untersuchungsbericht nach § 29 StVZO
Kennzeichen: M-AB 1234
Fahrgestellnummer: WVWZZZ1JZ3W386752
KM-Stand: 142.350 km
Prüfdatum: 15.04.2026
Prüforganisation: TÜV Süd
Ergebnis: ohne Mängel
`.trim(),

  percentSkontoTrap: `
Rechnung RE-99
Arbeitslohn                       200,00 €
Skonto -15% bei Zahlung in 10 Tagen
MwSt 19%                           38,00 €
Rechnungsbetrag                   238,00 €
`.trim(),
} as const;

export type OcrSampleId = keyof typeof OCR_SAMPLES;
