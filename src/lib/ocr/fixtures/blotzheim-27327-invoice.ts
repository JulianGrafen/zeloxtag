/** OCR fixture for Blotzheim invoice 27327 — Pos table with row-local totals. */
export const BLOTZHEIM_27327_OCR_TEXT = `
KFZ Service Blotzheim
Rechnungs-Nr. 27327

Pos Nummer Bezeichnung/Beschreibung Menge Einh. E-Preis Ges. Preis St.
1 7.10334.07.0 AGR-Ventil 1,00 218,88 218,88 A
2 1G02 Abgasrückführungsventil erneuern 0,60 90,00 54,00 A
3 18 Winterräder montiert 1,00 20,00 20,00 A

Nettosumme 292,88
MwSt (19 % (A)) 55,65
Gesamtbetrag 348,53
`.trim();

export const BLOTZHEIM_27327_NET_SUM = 292.88;
export const BLOTZHEIM_27327_VAT = 55.65;
export const BLOTZHEIM_27327_GROSS = 348.53;

export const BLOTZHEIM_27327_POSITIONS = [
  { label: "AGR-Ventil", amount: 218.88 },
  { label: "Abgasrückführungsventil erneuern", amount: 54 },
  { label: "Winterräder montiert", amount: 20 },
] as const;
