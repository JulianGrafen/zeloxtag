export function parseGermanNumber(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;

  // Strip letters, currency symbols, and spaces
  let clean = String(val).replace(/[^0-9,\.-]/g, '');
  if (!clean || clean === '-' || clean === '.' || clean === ',') return null;

  // Handle "1.000,50" vs "141,46"
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }

  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

function roundMoney(value: number): number {
  return parseFloat(value.toFixed(2));
}

/**
 * Bulletproof Ges. Preis resolution for German workshop invoices.
 *
 * Critical invariants (Blotzheim / real OCR):
 * - Never overwrite a printed Ges. Preis with E-Preis just because Menge was blank.
 * - Only trust menge × E-Preis when BOTH raw Menge and raw E-Preis were present.
 * - If Ges. Preis equals E-Preis but Menge > 1 → LLM copied the wrong column → use computed.
 */
export function processLineItems(llmItems: any[]) {
  if (!Array.isArray(llmItems)) return [];

  return llmItems.map((item) => {
    const rawMenge = parseGermanNumber(item?.menge);
    const rawEPreis = parseGermanNumber(item?.einzelpreis);
    const rawGesPreis = parseGermanNumber(item?.gesamtpreis);

    const mengeKnown = rawMenge !== null && rawMenge > 0;
    const menge = mengeKnown ? rawMenge : 1;

    let ePreis = rawEPreis;
    let gesPreis = rawGesPreis;

    // Both Menge and E-Preis known → compute and cross-check.
    if (mengeKnown && rawEPreis !== null) {
      const computedTotal = roundMoney(menge * rawEPreis);

      if (gesPreis === null) {
        gesPreis = computedTotal;
      } else if (Math.abs(gesPreis - computedTotal) > 0.05) {
        // Typical LLM bug: copied E-Preis into Ges. Preis (e.g. 165,99 instead of 331,98).
        gesPreis = computedTotal;
      }
      ePreis = rawEPreis;
    } else if (gesPreis !== null && rawEPreis !== null) {
      // Menge blank (Arbeitslohn / single piece). Keep printed Ges. Preis — do NOT
      // replace it with 1 × E-Preis when they differ for any reason; prefer GP.
      // If GP is missing-looking equal to EP, keep it (qty defaulted to 1).
      ePreis = rawEPreis;
      // gesPreis already set from document
    } else if (gesPreis !== null && rawEPreis === null) {
      // Only Ges. Preis printed.
      ePreis = mengeKnown && menge > 0 ? roundMoney(gesPreis / menge) : gesPreis;
    } else if (rawEPreis !== null) {
      // Only E-Preis printed (blank Ges. Preis) → total = menge × EP (menge defaults to 1).
      ePreis = rawEPreis;
      gesPreis = roundMoney(menge * rawEPreis);
    } else {
      ePreis = 0;
      gesPreis = 0;
    }

    return {
      ...item,
      menge,
      einzelpreis: ePreis ?? 0,
      gesamtpreis: gesPreis ?? 0,
    };
  });
}

/**
 * Pick the amount that is more likely a Ges. Preis (line total), not E-Preis.
 * Prefer the larger value when one is an integer multiple of the other.
 */
export function preferLineTotalAmount(
  a: number | null | undefined,
  b: number | null | undefined,
): number | null {
  if (a == null && b == null) return null;
  if (a == null) return b ?? null;
  if (b == null) return a;

  if (Math.abs(a - b) < 0.02) return a;

  const smaller = Math.min(a, b);
  const larger = Math.max(a, b);
  const ratio = larger / smaller;
  const qty = Math.round(ratio);
  // Strict ratio — avoid false upgrades like 95 → 480 (ratio ≈ 5.05).
  if (qty >= 2 && qty <= 100 && Math.abs(ratio - qty) < 0.02) {
    return larger;
  }

  return larger;
}
