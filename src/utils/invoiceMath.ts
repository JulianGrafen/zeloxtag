/**
 * Bulletproof German number parsing and invoice line-item math.
 *
 * Two-step "Extract & Compute" model:
 *   1. LLM copies raw text per column (Menge, Einzelpreis, Ges. Preis).
 *   2. TypeScript parses German formats and verifies/corrects the total.
 */

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Parse any German-formatted number string into a JS number.
 *
 * Strips all characters except digits, commas, dots, and minus so that
 * suffixes like "€", "Liter", "Stk.", whitespace etc. are harmless.
 *
 * Format detection after stripping:
 *  - Multiple dots          → all are thousands separators (e.g. "1.000.000,50")
 *  - Dot + comma            → dot = thousands, comma = decimal    ("1.234,56")
 *  - Dot, no comma, 3 post-dot digits → German thousands ("1.000" → 1000)
 *  - Dot, no comma, ≠3 post-dot digits → US/LLM decimal   ("1.60" → 1.6)
 *  - Comma, no dot          → German decimal comma               ("141,46")
 *  - Neither                → plain integer                           ("4")
 *
 * Returns `null` for falsy input, non-numeric strings, or NaN results.
 */
export function parseGermanNumber(val: string | null | undefined): number | null {
  if (!val?.trim()) return null;

  // Reject pure percentage strings before stripping removes the '%' marker.
  if (/^-?\d+([.,]\d+)?\s*%$/.test(val.trim())) return null;

  // Strip everything that is not a digit, comma, dot, or minus sign.
  const stripped = val.replace(/[^\d,.\-]/g, "").trim();
  if (!stripped || stripped === "-") return null;

  const dotCount = (stripped.match(/\./g) ?? []).length;
  const hasComma = stripped.includes(",");

  let normalized: string;

  if (dotCount > 1) {
    // "1.000.000,50" or "1.000.000" → remove all dots, swap comma→dot
    normalized = stripped.replace(/\./g, "").replace(",", ".");
  } else if (dotCount === 1 && hasComma) {
    // "1.234,56" → dot is thousands, comma is decimal
    normalized = stripped.replace(".", "").replace(",", ".");
  } else if (dotCount === 1 && !hasComma) {
    const afterDot = stripped.split(".")[1] ?? "";
    if (afterDot.length === 3) {
      // "1.000" → German thousands separator, no decimal part → 1000
      normalized = stripped.replace(".", "");
    } else {
      // "1.60", "141.60" → US/LLM decimal dot
      normalized = stripped;
    }
  } else if (!dotCount && hasComma) {
    // "141,46" → German decimal comma
    normalized = stripped.replace(",", ".");
  } else {
    // Plain integer: "4", "120"
    normalized = stripped;
  }

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}

// ─── Processed output type ────────────────────────────────────────────────────

/** Strictly typed result of one verified line-item row. */
export type ProcessedLineItem = {
  label: string;
  quantity: number;
  unitPrice: number;
  /** Mathematically verified total (quantity × unitPrice, or Ges. Preis when consistent). */
  totalPrice: number;
};

// ─── Math & fallback ─────────────────────────────────────────────────────────

const ROUNDING_TOLERANCE = 0.05; // €0.05 — covers per-item rounding on multi-unit rows

function extractString(item: Record<string, unknown>, key: string): string | null {
  const val = item[key];
  return typeof val === "string" && val.trim() ? val.trim() : null;
}

/**
 * Process the raw LLM line-item array into verified `ProcessedLineItem` objects.
 *
 * Per item:
 * 1. Parse Menge (default 1 when blank/unreadable).
 * 2. Parse Einzelpreis (default 0 when blank).
 * 3. Parse Ges. Preis.
 * 4. Compute `quantity × unitPrice`.
 * 5. If Ges. Preis is missing OR differs from computed by more than €0.05,
 *    use the computed value — the LLM likely copied the wrong column.
 *
 * Items with no recoverable price (both EP and GP absent) are dropped.
 *
 * @param rawItems - Array from LLM JSON (typed as `unknown[]` to avoid `any`).
 */
export function processLineItems(rawItems: unknown[]): ProcessedLineItem[] {
  const result: ProcessedLineItem[] = [];

  for (const raw of rawItems) {
    if (typeof raw !== "object" || raw === null) continue;
    const item = raw as Record<string, unknown>;

    const label = extractString(item, "label");
    if (!label) continue;

    const quantity = parseGermanNumber(extractString(item, "menge")) ?? 1;
    const unitPrice = parseGermanNumber(extractString(item, "einzelpreis")) ?? 0;
    const reportedTotal = parseGermanNumber(extractString(item, "gesamtpreis"));

    // Skip rows that carry absolutely no price information.
    if (unitPrice === 0 && reportedTotal === null) continue;

    const computedTotal = Math.round(quantity * unitPrice * 100) / 100;

    let totalPrice: number;
    if (reportedTotal === null) {
      // No Ges. Preis printed — fall back to qty × EP.
      totalPrice = computedTotal;
    } else if (unitPrice === 0) {
      // EP absent — trust the printed Ges. Preis directly.
      totalPrice = reportedTotal;
    } else if (Math.abs(reportedTotal - computedTotal) > ROUNDING_TOLERANCE) {
      // Mismatch beyond tolerance: LLM likely wrote EP in the GP field.
      totalPrice = computedTotal;
    } else {
      // Consistent — keep the printed total (preserves document rounding).
      totalPrice = reportedTotal;
    }

    result.push({ label, quantity, unitPrice, totalPrice });
  }

  return result;
}
