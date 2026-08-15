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

/** OCR dropped leading digits (1,47 vs 141,46) or scaled by 10/100. */
function looksLikeTruncatedTotal(printed: number, computed: number): boolean {
  if (printed <= 0 || computed <= 0) return false;
  if (printed >= computed * 0.25) return false;

  const printedCents = String(Math.round(printed * 100));
  const computedCents = String(Math.round(computed * 100));
  if (computedCents.endsWith(printedCents)) return true;
  if (Math.abs(printed * 10 - computed) < 0.15) return true;
  if (Math.abs(printed * 100 - computed) < 0.15) return true;
  return printed < computed * 0.2;
}

/**
 * Resolve Ges. Preis from Menge × E-Preis when the printed total is missing
 * or OCR-garbled. Keeps genuine line discounts (printed GP below qty×EP).
 */
export function resolveInvoiceRowGesamtpreis(options: {
  menge: number | null;
  einzelpreis: number | null;
  gesamtpreis: number | null;
  /** Rabatt-% from a dedicated column (10 = 10 % off). */
  rabattPercent?: number | null;
}): number | null {
  const rawMenge = options.menge;
  const rawEPreis = options.einzelpreis;
  const rawGesPreis = options.gesamtpreis;
  const rabattPercent = options.rabattPercent;

  if (rawEPreis === null && rawGesPreis === null) return null;
  if (rawEPreis === null) return rawGesPreis;

  const menge = rawMenge !== null ? rawMenge : 1;
  const computedTotal = parseFloat((menge * rawEPreis).toFixed(2));
  const discountedFromPercent =
    rabattPercent != null && Number.isFinite(rabattPercent)
      ? parseFloat((computedTotal * (1 - rabattPercent / 100)).toFixed(2))
      : null;

  if (rawGesPreis === null) {
    return discountedFromPercent ?? computedTotal;
  }
  if (Math.abs(rawGesPreis - computedTotal) <= 0.05) return rawGesPreis;
  if (
    discountedFromPercent != null &&
    Math.abs(rawGesPreis - discountedFromPercent) <= 0.08
  ) {
    return rawGesPreis;
  }

  // Printed total higher than qty×EP → shifted/wrong cell, not a discount.
  if (rawGesPreis > computedTotal + 0.05) {
    return computedTotal;
  }

  // EP copied into Ges. Preis on multi-qty rows (not a 1/qty "discount").
  const qtyNotOne = Math.abs(menge - 1) > 0.001;
  if (qtyNotOne && Math.abs(rawGesPreis - rawEPreis) <= 0.05) {
    return discountedFromPercent ?? computedTotal;
  }

  if (looksLikeTruncatedTotal(rawGesPreis, computedTotal)) {
    return computedTotal;
  }

  // Genuine line discount: printed GP is a plausible fraction of qty×EP.
  if (rawGesPreis >= computedTotal * 0.25) {
    return rawGesPreis;
  }

  return discountedFromPercent ?? computedTotal;
}

export type ProcessLineItemsOptions = {
  /**
   * `column` — Pos tables (Menge/E-Preis/Ges. Preis): always reconcile GP with Menge×EP.
   * `standard` — workshop/unknown: keep printed discounts (GP < EP).
   */
  checksumMode?: "column" | "standard";
};

export function processLineItems(
  llmItems: any[],
  options: ProcessLineItemsOptions = {},
) {
  const checksumMode = options.checksumMode ?? "standard";
  if (!Array.isArray(llmItems)) return [];

  return llmItems.map(item => {
    const signDiscount = (gesamtpreis: number | null) => {
      if (
        gesamtpreis != null &&
        gesamtpreis > 0 &&
        typeof item.label === "string" &&
        /rabatt|skonto|nachlass|gutschrift/i.test(item.label)
      ) {
        return -gesamtpreis;
      }
      return gesamtpreis;
    };

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
        gesamtpreis: signDiscount(rawGesPreis),
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
          gesamtpreis: signDiscount(rawGesPreis),
        };
      }
    }

    // Rule 1: If Menge is missing, default to 1 only when Ges. Preis or E-Preis needs computing
    let menge = rawMenge !== null ? rawMenge : 1;
    
    // Rule 2: If E-Preis is missing but GesPreis exists, use GesPreis as E-Preis (since menge is likely 1)
    const ePreis = rawEPreis !== null ? rawEPreis : (rawGesPreis !== null ? rawGesPreis : 0);
    
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

    const rabattPercent = parseGermanNumber(item.rabatt ?? item.rabatt_percent);
    const gesPreisFromColumns = resolveInvoiceRowGesamtpreis({
      menge,
      einzelpreis: ePreis,
      gesamtpreis: rawGesPreis,
      rabattPercent:
        rabattPercent != null && Math.abs(rabattPercent) <= 100
          ? Math.abs(rabattPercent)
          : null,
    });
    const computedTotal = parseFloat((menge * ePreis).toFixed(2));
    let gesPreis = gesPreisFromColumns;
    // Column mode still recomputes missing/garbled totals via resolveInvoiceRowGesamtpreis.
    // Do not force qty×EP here — that would wipe printed line discounts.
    if (checksumMode === "column" && gesPreis == null) {
      gesPreis = computedTotal;
    }

    return {
      ...item,
      menge,
      einzelpreis: ePreis,
      gesamtpreis: signDiscount(gesPreis),
    };
  });
}
