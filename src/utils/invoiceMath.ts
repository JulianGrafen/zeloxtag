export function parseGermanNumber(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  
  // Strip letters, currency symbols, and spaces
  let clean = String(val).replace(/[^0-9,\.-]/g, '');
  if (!clean) return null;

  // Handle "1.000,50" vs "141,46"
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }
  
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/** Plain integer without comma — often Pos column, not Menge ("4" vs "4,00"). */
function looksLikePosInMengeField(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === "number") return Number.isInteger(val) && val >= 1 && val <= 999;
  const trimmed = String(val).trim();
  return /^\d{1,3}$/.test(trimmed) && !trimmed.includes(",");
}

function hasMengeOrUnit(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  return String(val).trim().length > 0;
}

/** E-Preis alone (no Menge/Einh., no Ges. Preis) is a rate — not billable. */
function isRateOnlyRow(
  rawMenge: number | null,
  rawEPreis: number | null,
  rawGesPreis: number | null,
  mengeField: unknown,
): boolean {
  return (
    rawGesPreis === null &&
    rawEPreis !== null &&
    rawMenge === null &&
    !hasMengeOrUnit(mengeField)
  );
}

export function processLineItems(llmItems: any[]) {
  if (!Array.isArray(llmItems)) return [];

  return llmItems.map(item => {
    const rawMenge = parseGermanNumber(item.menge);
    const rawEPreis = parseGermanNumber(item.einzelpreis);
    const rawGesPreis = parseGermanNumber(item.gesamtpreis);

    if (isRateOnlyRow(rawMenge, rawEPreis, rawGesPreis, item.menge)) {
      return {
        ...item,
        menge: null,
        einzelpreis: rawEPreis,
        gesamtpreis: 0,
      };
    }

    // Printed line total without Einzelpreis (typical Arbeitswerte: Std + Preis-€).
    if (rawEPreis === null && rawGesPreis !== null) {
      return {
        ...item,
        menge: rawMenge,
        einzelpreis: null,
        gesamtpreis: rawGesPreis,
      };
    }

    // Art column (1–9) mistaken for menge when EP looks like hours, not unit price.
    if (
      rawGesPreis !== null &&
      rawEPreis !== null &&
      rawEPreis > 0 &&
      looksLikePosInMengeField(item.menge)
    ) {
      const posProduct = parseFloat(((rawMenge ?? 0) * rawEPreis).toFixed(2));
      const epLooksLikeHours =
        rawEPreis < 20 && rawEPreis < rawGesPreis / 5;
      if (
        epLooksLikeHours &&
        Math.abs(posProduct - rawGesPreis) > 0.05
      ) {
        return {
          ...item,
          menge: rawMenge,
          einzelpreis: null,
          gesamtpreis: rawGesPreis,
        };
      }
    }

    // Rule 1: If Menge is missing, default to 1 only when Ges. Preis or E-Preis needs computing
    let menge = rawMenge !== null ? rawMenge : 1;
    
    // Rule 2: If E-Preis is missing but GesPreis exists, use GesPreis as E-Preis (since menge is likely 1)
    const ePreis = rawEPreis !== null ? rawEPreis : (rawGesPreis !== null ? rawGesPreis : 0);
    
    let gesPreis = rawGesPreis;

    // Pos column copied into menge: when GP and EP both exist, derive qty from GP ÷ EP
    // if the LLM menge × EP does not match GP (e.g. Pos "4" × 28,80 ≠ 28,80).
    if (rawGesPreis !== null && rawEPreis !== null && rawEPreis > 0) {
      const fromRawMenge = parseFloat((menge * rawEPreis).toFixed(2));
      const inferredMenge = parseFloat((rawGesPreis / rawEPreis).toFixed(2));
      const fromInferred = parseFloat((inferredMenge * rawEPreis).toFixed(2));
      const rawMatches = Math.abs(fromRawMenge - rawGesPreis) <= 0.05;
      const inferredMatches = Math.abs(fromInferred - rawGesPreis) <= 0.05;

      if (inferredMatches && !rawMatches && looksLikePosInMengeField(item.menge)) {
        menge = inferredMenge;
      }
    }

    // Rule 3: Math Checksum (Menge * E-Preis)
    const computedTotal = parseFloat((menge * ePreis).toFixed(2));

    // Rule 4: Overwrite if GesPreis is missing OR checksum deviates (LLM row-shift / EP→GP copy).
    if (gesPreis === null) {
      gesPreis = computedTotal;
    } else if (Math.abs(gesPreis - computedTotal) > 0.05) {
      const looksLikeDiscount =
        rawGesPreis !== null &&
        rawEPreis !== null &&
        rawGesPreis < computedTotal - 0.05 &&
        Math.abs(rawGesPreis - rawEPreis) > 0.05 &&
        rawGesPreis >= computedTotal * 0.5;
      const epCopiedIntoGp =
        rawGesPreis !== null &&
        rawEPreis !== null &&
        Math.abs(rawGesPreis - rawEPreis) <= 0.05 &&
        rawMenge !== null &&
        rawMenge > 1.001;
      const laborEpUsedAsGp =
        rawGesPreis !== null &&
        rawEPreis !== null &&
        rawMenge !== null &&
        rawMenge > 0 &&
        rawMenge < 10 &&
        Math.abs(rawGesPreis - rawEPreis) <= 0.05 &&
        Math.abs(computedTotal - rawGesPreis) > 0.05;
      if (!looksLikeDiscount && (epCopiedIntoGp || laborEpUsedAsGp || rawEPreis !== null)) {
        gesPreis = computedTotal;
      }
    }

    return {
      ...item,
      menge,
      einzelpreis: ePreis,
      gesamtpreis: gesPreis
    };
  });
}
