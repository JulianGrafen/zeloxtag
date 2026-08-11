/**
 * Regression fixture: TÜV Gutachten zur ABE Nr. 48571 (Interpneu / PLATIN TAM3325-8017).
 * Ground truth from user scans — IMG_7041 (Stammdaten), IMG_7042/7043 (Verwendungsbereich).
 */

export const ABE_KBA_48571_OCR_SNIPPET = `
Gutachten zur ABE Nr. 48571 nach §22 StVZO
Prüfgegenstand PKW-Sonderrad 8Jx17EH2+ Typ TAM3325-8017
Hersteller Interpneu Handelsgesellschaft mbH
Auftraggeber Interpneu Handelsgesellschaft mbH An der Roßweid 23-25 76229 Karlsruhe
Modell TAM3325 Typ TAM3325-8017 Radgröße 8Jx17EH2+ Zentrierart Mittenzentrierung
Kennzeichnungen KBA-Nummer 48571 Herstellerzeichen PLATIN GERMANY
Radtyp und Ausführung TAM3325-8017 (s.o.) Radgröße 8Jx17EH2+
Verwendungsbereich Hersteller BMW Spurverbreiterung innerhalb 2%
BMW 3er-Compact 346K e1*98/14*0167*.. e1*2001/116*0167*..
BMW 3er-Reihe 3/CG e1*93/81*0017*. e1*98/14*0017*.
BMW 3er-Reihe 346C, 346R e1*98/14, 2001/116* 0112, 0146*.
BMW 3er-Reihe 346L e1*97/27*0097*.. e1*98/14*0097*..
215/45R17 225/45R17 K2b K41 A01 A02 A04 A05 V17 S01
Auflagen und Hinweise A01 A02 A04 A05
`.trim();

export const ABE_KBA_48571_EXPECTED_STAMMDATEN = {
  kbaNumber: "48571",
  abeNumber: "48571",
  abeHolder: /interpneu handelsgesellschaft/i,
  manufacturer: /interpneu handelsgesellschaft/i,
  partDesignation: /PKW-Sonderrad.*8Jx17EH2\+.*TAM3325-8017/i,
} as const;

/** Simulated hunt-all LLM rows for the Verwendungsbereich table (page 2). */
export const ABE_KBA_48571_LLM_VEHICLE_ROWS = [
  {
    handelsbezeichnung: "BMW 3er-Compact",
    fahrzeugtyp: "346K",
    technischeBezeichnung: "e1*98/14*0167*.., e1*2001/116*0167*..",
    reifen: ["215/45R17", "225/45R17"],
    auflagenCodes: ["K2b", "K41", "A01", "A02", "A04", "V17", "S01"],
  },
  {
    handelsbezeichnung: "BMW 3er-Reihe",
    fahrzeugtyp: "3/CG",
    technischeBezeichnung: "e1*93/81*0017*., e1*98/14*0017*.",
    reifen: ["205/50R17"],
    auflagenCodes: ["K1c", "K2b", "L02", "A01", "A02", "A04", "V17", "S01"],
  },
  {
    handelsbezeichnung: "BMW 3er-Reihe",
    fahrzeugtyp: "346L",
    technischeBezeichnung: "e1*97/27*0097*.., e1*98/14*0097*..",
    reifen: ["225/45R17", "235/40R17"],
    auflagenCodes: ["K2c", "K42", "A01", "A02", "A04", "A12", "V17", "S01"],
  },
  {
    handelsbezeichnung: "BMW 3er-Reihe",
    fahrzeugtyp: "346C, 346R",
    technischeBezeichnung: "e1*98/14, 2001/116* 0112, 0146*",
    reifen: ["215/45R17"],
    auflagenCodes: ["K2b", "A01", "A02"],
  },
] as const;

export const ABE_KBA_48571_FIXTURE_IMAGES = {
  stammdaten:
    "/Users/julian/.cursor/projects/Users-julian-cursor-ZeloxTag/assets/IMG_7041-1db70a14-5aae-44a2-9edf-57d38f862f7d.png",
  verwendungsbereich1:
    "/Users/julian/.cursor/projects/Users-julian-cursor-ZeloxTag/assets/IMG_7042-de3e5869-ae07-48a1-a244-0f11db38b412.png",
  auflagenText:
    "/Users/julian/.cursor/projects/Users-julian-cursor-ZeloxTag/assets/IMG_7043-083e7548-6d8d-4968-b34c-208be177fcb4.png",
} as const;

/** Noisy hunt-all output captured from IMG_7042 — regression for post-processing filters. */
export const ABE_KBA_48571_NOISY_LLM_ROWS = [
  {
    verkaufsbezeichnung: "BMW 1er-Reihe",
    fahrzeugtyp: null,
    tireSizes: ["215/45R17"],
    auflagenCodes: ["K1C", "K2B", "K41", "T87", "T89", "K7C", "A01", "A02"],
  },
  {
    verkaufsbezeichnung: "BMW 1er-Reihe",
    fahrzeugtyp: null,
    tireSizes: ["225/45R17"],
    auflagenCodes: ["K2B", "K41", "T87", "K7B", "A01", "A02"],
  },
  {
    verkaufsbezeichnung: "BMW 3er-Compact",
    fahrzeugtyp: "346K",
    tireSizes: ["215/45R17"],
    auflagenCodes: ["K2B", "K41", "A01", "A02", "A04", "V17", "S01", "K7C", "T87"],
  },
  {
    verkaufsbezeichnung: "BMW 3er-Reihe",
    fahrzeugtyp: "3/CG",
    tireSizes: ["215/45R17"],
    auflagenCodes: ["K1C", "K2B", "K41", "L02", "A01", "A02", "A04", "V17", "S01"],
  },
  {
    verkaufsbezeichnung: "BMW 3er-Reihe",
    fahrzeugtyp: "346L",
    technischeBezeichnung: "e1*97/27*0097*..",
    tireSizes: ["225/45R17"],
    auflagenCodes: ["K2C", "K42", "A01", "A02", "A04", "A12", "V17", "S01"],
  },
] as const;
