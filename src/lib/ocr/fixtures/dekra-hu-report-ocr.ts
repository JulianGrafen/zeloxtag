/** OCR fixture from DEKRA HU report (Mechernich, IMG_7036). */
export const DEKRA_HU_REPORT_OCR = `
(1) FIN
WBAMX51020C763755

(2) Kennz.
DEU JG183

(3) Prüfort Mechernich, 23.03.2021

(4) km-St.
178605

an Ihrem Fahrzeug wurden erhebliche Mängel festgestellt.

(6) Festgestellte Mängel:
2.6b (EM)
Elektromechanische Servolenkung
Unterstützungsmoment mangelhaft
2.6d (EM)
Elektromechanische Servolenkung signalisiert
Fehlfunktion
-5.2.3d (EM)
Reifen alle Alterungsrisse
-D5.2.3c (EM)
M+S Reifen Geschwindigkeitsschild fehlt
Hinweise:
-Bremsbelag vorne in Kürze verschlissen

Hauptuntersuchung inkl. AU mit Abgasmessung 123,81 EUR
Vorgaben nach Nr. 1 Anlage VIIIa StVZO 1,19 EUR
Gesamtbetrag ohne MwSt
105,04 EUR
MwSt 19%
19,96 EUR
Gesamtbetrag inkl. MwSt
125,00 EUR
`.trim();

export const DEKRA_HU_REPORT_EXPECTED = {
  mileageKm: 178605,
  testDate: "2021-03-23",
  amount: 125,
  defectCheckpoints: ["2.6b", "2.6d", "5.2.3d", "D5.2.3c"],
  defectDescriptions: [
    "Elektromechanische Servolenkung Unterstützungsmoment mangelhaft",
    "Elektromechanische Servolenkung signalisiert Fehlfunktion",
    "Reifen alle Alterungsrisse",
    "M+S Reifen Geschwindigkeitsschild fehlt",
  ],
} as const;
