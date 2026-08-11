/** Synthetic OCR for TM motorsport column invoice (409219) — regression fixture. */
export const TM_MOTORSPORT_OCR_TEXT = `
TM motorsport
Rechnungs-Nr. 409219
Datum 08.05.2026
Km-Stand 297.976

Pos Nummer Bezeichnung Menge Einh. E-Preis Ges. Preis St.
1 8566434 Fehlersuche Dynamic Drive System / Kabelverbindungen geprüft und gemessen 1,63 92,00 149,96 A
2 Änderungsabnahme gemäß §19 Abs. 3 / KW V1 Gewindefahrwerk / geänd. Rad-/Reifenkombination 1,00 245,29 245,29 0

Nettosumme 395,25
MwSt (19 % (A)) 28,49
Gesamtbetrag 423,74
`.trim();

export const TM_MOTORSPORT_EXPECTED_POSITIONS = [
  { label: "Fehlersuche Dynamic Drive System", amount: 149.96 },
  {
    label: "Änderungsabnahme gemäß §19 Abs. 3",
    amount: 245.29,
  },
] as const;

export const TM_MOTORSPORT_NET_SUM = 395.25;
export const TM_MOTORSPORT_VAT = 28.49;
export const TM_MOTORSPORT_GROSS = 423.74;

/** Typical misread when footer rows bleed into the table. */
export const TM_MOTORSPORT_BAD_LLM_ITEMS = [
  {
    label:
      "Änderungsabnahme gemäß §19 Abs. 3 KW V1 Gewindefahrwerk geänd. Rad-/Reifenkombination",
    amount: 149.96,
  },
  { label: "Gesamtbetrag", amount: 28.49 },
  { label: "MwSt 19% (19 %) (A)", amount: 245.29 },
] as const;
