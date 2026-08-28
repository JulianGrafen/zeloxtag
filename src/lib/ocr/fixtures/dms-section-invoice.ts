/**
 * Vendor-neutral DMS section invoice (Arbeitszeit / Material / Fremdleistungen).
 * Camera-style column split: Std/Einzelpreis on their own lines before Preis-€.
 */

export const DMS_SECTION_CAMERA_OCR_TEXT = `
Autohaus Berg GmbH
Rechnung Nr. 2026-08-1001
Datum 12.08.2026

Arbeitszeit
Beschreibung Std. Preis-€
Diagnose Kühlkreislauf
0,75
89,00
Kunde bemängelt Geräusch
Dichtung erneuern
1,20
110,50

Material
Anzahl Beschreibung Einzelpreis Preis-€
1 Stück Ölfilter
12,50
12,50
2 Stück Dichtring
1,20
2,40

Fremdleistungen
Anzahl Beschreibung Einzelpreis Preis-€
1 Fracht
8,00
8,00

Positionssumme 222,40
Netto Summe 222,40 €
MwSt. 19,0 % 42,26 €
Endpreis 264,66 €
`.trim();

export const DMS_SECTION_NET_SUM = 222.4;
export const DMS_SECTION_GROSS_TOTAL = 264.66;
