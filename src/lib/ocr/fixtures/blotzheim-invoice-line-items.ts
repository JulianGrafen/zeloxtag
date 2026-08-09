/**
 * Ground-truth line items from Frank Blotzheim Rechnung 27646 (05.02.2026).
 * Used to lock Extract & Compute behaviour against a real workshop invoice.
 *
 * Columns on the paper: Menge | E-Preis | Ges. Preis
 * Row 2 ("Bremsbeläge erneuern") has blank Menge and blank Ges. Preis —
 * only E-Preis 90,00 € (Stundensatz) → not billable, excluded from totals.
 */

export type BlotzheimRawLineItem = {
  label: string;
  menge: string | null;
  einzelpreis: string | null;
  gesamtpreis: string | null;
};

/** Exactly what the LLM should copy from the paper (raw strings, null = blank cell). */
export const BLOTZHEIM_LLM_RAW_LINE_ITEMS: BlotzheimRawLineItem[] = [
  {
    label: "Bremsbelagsatz, Scheibenbremse",
    menge: "1,00",
    einzelpreis: "141,46 €",
    gesamtpreis: "141,46 €",
  },
  {
    label: "Bremsbeläge erneuern (Hinterachse)",
    menge: null,
    einzelpreis: "90,00 €",
    gesamtpreis: null,
  },
  {
    label: "Warnkontakt, Bremsbelagverschleiß",
    menge: "1,00",
    einzelpreis: "28,80 €",
    gesamtpreis: "28,80 €",
  },
  {
    label: "Bremsscheibe PRO+",
    menge: "2,00",
    einzelpreis: "165,99 €",
    gesamtpreis: "331,98 €",
  },
  {
    label: "Beide Bremsscheiben erneuern (Hinterachse)",
    menge: "0,90",
    einzelpreis: "90,00 €",
    gesamtpreis: "81,00 €",
  },
  {
    label: "Beide Schraubenfedern erneuern (Vorderachse)",
    menge: "2,50",
    einzelpreis: "90,00 €",
    gesamtpreis: "225,00 €",
  },
  {
    label: "Dichtungssatz, Zylinderkopfhaube",
    menge: "1,00",
    einzelpreis: "36,60 €",
    gesamtpreis: "36,60 €",
  },
  {
    label: "Ventildeckeldichtung erneuern",
    menge: "4,00",
    einzelpreis: "90,00 €",
    gesamtpreis: "360,00 €",
  },
  {
    label: "Thermostat, Kühlmittel",
    menge: "1,00",
    einzelpreis: "103,38 €",
    gesamtpreis: "103,38 €",
  },
  {
    label: "Kühlerfrostschutz",
    menge: "3,00 Liter",
    einzelpreis: "7,14 €",
    gesamtpreis: "21,42 €",
  },
  {
    label: "Kühlmittelthermostat erneuern",
    menge: "1,50",
    einzelpreis: "90,00 €",
    gesamtpreis: "135,00 €",
  },
  {
    label: "Ölfilter",
    menge: "1,00",
    einzelpreis: "23,86 €",
    gesamtpreis: "23,86 €",
  },
  {
    label: "Motoröl und Filter wechseln",
    menge: "0,50",
    einzelpreis: "90,00 €",
    gesamtpreis: "45,00 €",
  },
  {
    label: "Motoröl 5W30",
    menge: "7,00 Liter",
    einzelpreis: "13,45 €",
    gesamtpreis: "94,15 €",
  },
  {
    label: "Tüv Gebühr",
    menge: "1,00",
    einzelpreis: "171,90 €",
    gesamtpreis: "171,90 €",
  },
  {
    label: "Schraube, Einspritzdüsenhalter ORIGINAL ERSATZTEIL GREENPARTS",
    menge: "6,00",
    einzelpreis: "2,51 €",
    gesamtpreis: "15,06 €",
  },
  {
    label: "Dichtring, Einspritzdüse",
    menge: "6,00",
    einzelpreis: "3,50 €",
    gesamtpreis: "21,00 €",
  },
  {
    label: "Dichtring",
    menge: "6,00",
    einzelpreis: "3,90 €",
    gesamtpreis: "23,40 €",
  },
  {
    label: "Schraube",
    menge: "2,00",
    einzelpreis: "2,70 €",
    gesamtpreis: "5,40 €",
  },
  {
    label: "Mutter",
    menge: "2,00",
    einzelpreis: "1,66 €",
    gesamtpreis: "3,32 €",
  },
];

/** Expected Ges. Preis after processLineItems (amount stored on the document). */
export const BLOTZHEIM_EXPECTED_TOTALS: Array<{ label: string; amount: number }> = [
  { label: "Bremsbelagsatz, Scheibenbremse", amount: 141.46 },
  { label: "Bremsbeläge erneuern (Hinterachse)", amount: 0 },
  { label: "Warnkontakt, Bremsbelagverschleiß", amount: 28.8 },
  { label: "Bremsscheibe PRO+", amount: 331.98 },
  { label: "Beide Bremsscheiben erneuern (Hinterachse)", amount: 81 },
  { label: "Beide Schraubenfedern erneuern (Vorderachse)", amount: 225 },
  { label: "Dichtungssatz, Zylinderkopfhaube", amount: 36.6 },
  { label: "Ventildeckeldichtung erneuern", amount: 360 },
  { label: "Thermostat, Kühlmittel", amount: 103.38 },
  { label: "Kühlerfrostschutz", amount: 21.42 },
  { label: "Kühlmittelthermostat erneuern", amount: 135 },
  { label: "Ölfilter", amount: 23.86 },
  { label: "Motoröl und Filter wechseln", amount: 45 },
  { label: "Motoröl 5W30", amount: 94.15 },
  { label: "Tüv Gebühr", amount: 171.9 },
  {
    label: "Schraube, Einspritzdüsenhalter ORIGINAL ERSATZTEIL GREENPARTS",
    amount: 15.06,
  },
  { label: "Dichtring, Einspritzdüse", amount: 21 },
  { label: "Dichtring", amount: 23.4 },
  { label: "Schraube", amount: 5.4 },
  { label: "Mutter", amount: 3.32 },
];

/** Sum of all Ges. Preis values (for sanity checks). */
export const BLOTZHEIM_LINE_ITEMS_SUM = BLOTZHEIM_EXPECTED_TOTALS.reduce(
  (sum, item) => sum + item.amount,
  0,
);

/**
 * Common LLM failure mode on this invoice: copies E-Preis into Ges. Preis
 * and forgets to leave blank cells as null / forgets Menge for multi-qty rows.
 */
export const BLOTZHEIM_LLM_HALLUCINATED_LINE_ITEMS: BlotzheimRawLineItem[] = [
  {
    label: "Bremsscheibe PRO+",
    menge: "2,00",
    einzelpreis: "165,99 €",
    gesamtpreis: "165,99 €", // wrong — EP instead of GP
  },
  {
    label: "Ventildeckeldichtung erneuern",
    menge: "4,00",
    einzelpreis: "90,00 €",
    gesamtpreis: "90,00 €", // wrong
  },
  {
    label: "Motoröl 5W30",
    menge: "7,00 Liter",
    einzelpreis: "13,45 €",
    gesamtpreis: "13,45 €", // wrong
  },
  {
    label: "Bremsbeläge erneuern (Hinterachse)",
    menge: null,
    einzelpreis: "90,00 €",
    gesamtpreis: null,
  },
];
