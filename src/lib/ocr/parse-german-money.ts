/**
 * Robust German EUR amount parsing for invoice OCR / LLM output.
 * Fixes shifted decimal commas (141,60 → 1416,00) and OCR digit confusions.
 */

export const MIN_INVOICE_EUR = 0.01;
export const MAX_INVOICE_EUR = 250_000;

/**
 * German EUR token in OCR text.
 * Thousands: dot or space; decimals: 1–2 digits.
 */
/** Inline / table OCR amounts (strict — avoids article numbers like 7.10334.07.0). */
export const INVOICE_OCR_MONEY_TOKEN =
  "-?\\d{1,3}(?:\\.\\d{3})*,\\d{2}|-?\\d{1,3}(?:\\s\\d{3})+,\\d{1,2}|-?\\d+,\\d{2}";

/** Labeled footer totals — also allows 1999,0 without thousand separators. */
export const INVOICE_FOOTER_MONEY_CAPTURE =
  "(-?\\d{1,3}(?:[.\\s]\\d{3})*,\\d{1,2}|-?\\d{4,},\\d{1}|-?\\d+,\\d{2})";

/** @deprecated Use {@link INVOICE_FOOTER_MONEY_CAPTURE} for footers or {@link INVOICE_OCR_MONEY_TOKEN} for rows. */
export const INVOICE_OCR_MONEY_CAPTURE = INVOICE_FOOTER_MONEY_CAPTURE;

/** Global matcher for trailing / inline money tokens in invoice table rows. */
export const INVOICE_OCR_MONEY_PATTERN = new RegExp(
  `(${INVOICE_OCR_MONEY_TOKEN})`,
  "g",
);

const PAREN_TO_ONE = /\(/g;
const PAREN_TO_THREE = /\(/g;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function inInvoiceRange(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= MIN_INVOICE_EUR &&
    value <= MAX_INVOICE_EUR
  );
}

/** Line-item amounts may be negative (Rabatt / Aktionspreis on the invoice). */
export function inSignedInvoiceLineAmountRange(value: number): boolean {
  if (!Number.isFinite(value) || value === 0) return false;
  const abs = Math.abs(value);
  return abs >= MIN_INVOICE_EUR && abs <= MAX_INVOICE_EUR;
}

/** Strip wrappers and currency markers from a money token. */
export function normalizeMoneyOcrText(raw: string): string {
  return raw
    .trim()
    .replace(/\u00a0/g, "")
    .replace(/\s/g, "")
    .replace(/€|eur/gi, "")
    .replace(/^[)\]}'"`]+|[)\]}'"`]+$/g, "");
}

function stripLeadingParenOcr(raw: string): string {
  return raw.trim().replace(/\u00a0/g, "").replace(/\s/g, "").replace(/€|eur/gi, "");
}

/** True when the raw token is only digits (no decimal comma/dot) after normalization. */
export function rawMoneyIsBareIntegerToken(raw: string): boolean {
  const base = normalizeMoneyOcrText(stripLeadingParenOcr(raw));
  return /^-?\d+$/.test(base);
}

/** True when comma-shift heuristics apply (,00 misreads or 5+ digit plain integers). */
export function rawMoneyAllowsDecimalShift(raw: string): boolean {
  const base = normalizeMoneyOcrText(stripLeadingParenOcr(raw));
  if (/^-?\d{4,},\d{2}$/.test(base) && base.endsWith(",00")) return true;
  if (/^-?\d{4,}\.\d{2}$/.test(base) && base.endsWith(".00")) return true;
  if (/^-?\d{5,}$/.test(base)) return true;
  return false;
}

export type ResolveMoneyOptions = {
  /** When false, prefer the largest plausible candidate (no 10×/100× shift). */
  preferDecimalShift?: boolean;
};

/** Build parse candidates including (↔1/3) swaps and shifted-comma variants. */
export function moneyParseCandidates(raw: string): string[] {
  const stripped = stripLeadingParenOcr(raw);
  if (!stripped || /%/.test(stripped)) return [];

  const candidates = new Set<string>();

  // Leading "(" is often OCR for "1" (141,60 → (41,60) — fix before bracket stripping.
  if (/^\(\d/.test(stripped)) {
    candidates.add(stripped.replace(/^\(/, "1"));
    candidates.add(stripped.replace(/^\(/, "3"));
  }

  const base = normalizeMoneyOcrText(stripped);
  if (base) candidates.add(base);

  if (base.includes("(")) {
    candidates.add(base.replace(PAREN_TO_ONE, "1"));
    candidates.add(base.replace(PAREN_TO_THREE, "3"));
  }

  const addShiftedDecimal = (intPart: string, suffix: "," | ".") => {
    const altCents = `${intPart.slice(-1)}0`;
    if (altCents !== "00") {
      candidates.add(`${intPart.slice(0, -1)}${suffix}${altCents}`);
    }
  };

  // 1416,00 misread from 141,60 — move decimal one digit left before ,00
  const commaCents = base.match(/^(-?\d{4,}),(\d{2})$/);
  if (commaCents?.[1] && commaCents[2] === "00") {
    addShiftedDecimal(commaCents[1], ",");
  }

  // 1416.00 — same shift for LLM US-style output
  const dotCents = base.match(/^(-?\d{4,})\.(\d{2})$/);
  if (dotCents?.[1] && dotCents[2] === "00") {
    addShiftedDecimal(dotCents[1], ",");
  }

  // 14160 without decimals — insert decimal before last digit (not 4-digit totals like 1999)
  const plainInt = base.match(/^(-?\d{5,})$/);
  if (plainInt?.[1]) {
    addShiftedDecimal(plainInt[1], ",");
  }

  return [...candidates];
}

function parseSingleMoneyCandidate(raw: string): number | null {
  if (!raw || /%/.test(raw)) return null;

  let normalized = raw;

  // 1.234,56 / 1 234,5 — German thousands + decimal comma (spaces stripped before parse)
  if (/^-?\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) ? roundMoney(value) : null;
  }

  // 141,60 / 141,6 — German decimal comma
  if (/^-?\d+,\d{1,2}$/.test(normalized)) {
    normalized = normalized.replace(",", ".");
    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) ? roundMoney(value) : null;
  }

  // 141.60 — LLM US-style (only when no comma present)
  if (/^-?\d+\.\d{1,2}$/.test(normalized) && !raw.includes(",")) {
    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) ? roundMoney(value) : null;
  }

  // Plain integer token
  if (/^-?\d+$/.test(normalized)) {
    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) ? roundMoney(value) : null;
  }

  return null;
}

/**
 * When multiple parses exist (e.g. 1416 vs 141,60), prefer the smaller value
 * if it is exactly 10× or 100× smaller than the largest candidate AND carries
 * cent precision — typical comma-shift OCR error. Otherwise keep the largest.
 */
export function resolveAmbiguousMoneyValues(
  values: number[],
  options: ResolveMoneyOptions = {},
): number | null {
  const preferDecimalShift = options.preferDecimalShift ?? true;

  const unique = [...new Set(values.map(roundMoney))].filter(
    inSignedInvoiceLineAmountRange,
  );
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0]!;

  unique.sort((a, b) => a - b);
  const largest = unique[unique.length - 1]!;

  if (!preferDecimalShift) {
    return largest;
  }

  const hasCents = (value: number) =>
    Math.abs(value - Math.round(value)) > 0.001;

  const pickShifted = (ratio: 10 | 100): number | null => {
    for (const small of unique) {
      if (small >= largest || !hasCents(small)) continue;
      const matches =
        ratio === 10
          ? Math.abs(largest - small * 10) < 0.011
          : Math.abs(largest - small * 100) < 0.011;
      if (matches && small >= 0.01 && small <= 15_000) {
        return small;
      }
    }
    return null;
  };

  return pickShifted(10) ?? pickShifted(100) ?? largest;
}

/** Parse a German/EUR money string from OCR or LLM text. */
export function parseGermanMoneyAmount(raw: string): number | null {
  const stripped = stripLeadingParenOcr(raw);
  if (/^\(\d/.test(stripped)) {
    const asOne = parseSingleMoneyCandidate(
      normalizeMoneyOcrText(stripped.replace(/^\(/, "1")),
    );
    if (asOne !== null && inSignedInvoiceLineAmountRange(asOne)) {
      return asOne;
    }
  }

  const values = moneyParseCandidates(raw)
    .map(parseSingleMoneyCandidate)
    .filter(
      (value): value is number =>
        value !== null && inSignedInvoiceLineAmountRange(value),
    );

  const preferDecimalShift =
    rawMoneyAllowsDecimalShift(raw) ||
    (!rawMoneyIsBareIntegerToken(raw) && values.length > 1);

  return resolveAmbiguousMoneyValues(values, { preferDecimalShift });
}

/**
 * Fix numeric LLM output where the decimal comma was lost (1416 → 141.60).
 * Use `aggressive` for line items; totals should use conservative mode.
 */
export function sanitizeLlmMoneyAmount(
  amount: number,
  mode: "aggressive" | "conservative" = "aggressive",
): number {
  if (!Number.isFinite(amount)) return amount;

  let value = roundMoney(amount);
  if (value <= 0) return value;

  const candidates = [value];
  const looksLikeLostDecimal =
    Math.abs(value - Math.round(value)) < 0.001 && value >= 10;
  const digitCount = String(Math.round(Math.abs(value))).length;

  if (mode === "aggressive" && looksLikeLostDecimal) {
    if (digitCount >= 5) {
      candidates.push(roundMoney(value / 10));
    }
    if (digitCount >= 6) {
      candidates.push(roundMoney(value / 100));
    }
  }

  const plausible = candidates.filter(inInvoiceRange);
  const resolved = resolveAmbiguousMoneyValues(plausible, {
    preferDecimalShift: mode === "aggressive" && candidates.length > 1,
  });
  return resolved ?? value;
}

/** True when `larger` is ~10× or ~100× `smaller` (comma-shift misread). */
export function isLikelyDecimalShiftPair(
  smaller: number,
  larger: number,
): boolean {
  if (!Number.isFinite(smaller) || !Number.isFinite(larger)) return false;
  if (larger <= smaller + 0.01) return false;
  return (
    Math.abs(larger - smaller * 10) <= 0.05 ||
    Math.abs(larger - smaller * 100) <= 0.05
  );
}

/** Coerce LLM/OCR values (string or number) into EUR amounts. */
export function coerceGermanMoneyAmount(
  value: unknown,
  mode: "aggressive" | "conservative" = "aggressive",
): number | null {
  if (value == null || value === "") return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const sanitized = sanitizeLlmMoneyAmount(value, mode);
    if (sanitized < 0) {
      return inSignedInvoiceLineAmountRange(sanitized) ? sanitized : null;
    }
    return inInvoiceRange(sanitized) ? sanitized : null;
  }

  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /%/.test(trimmed)) return null;

  return parseGermanMoneyAmount(trimmed);
}
