import { parseGermanMoneyAmount } from "@/lib/ocr/parse-german-money";
import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";
import { normalizeTuevOcrText } from "@/lib/ocr/tuev-ocr-normalize";
import {
  parseTuevAmountValue,
  resolveTuevTotalAmount,
} from "@/lib/ocr/tuev-amount";

const MAX_FEE = 2_000;
const MIN_FEE = 5;

function parseFee(raw: string): number | null {
  const value = parseGermanMoneyAmount(raw);
  if (value === null || value < MIN_FEE || value > MAX_FEE) return null;
  return value;
}

const PARTIAL_FEE_LABEL =
  /^(?:hauptuntersuchung|\bhu\b|\bau\b|abgasuntersuchung|sonstiges|vorgaben|vergütung|prüfungsentgelt|untersuchung)\b/i;

const GESAMT_AMOUNT_PATTERN =
  /(?:gesamt(?:betrag|summe)?(?:\s+inkl\.?\s*(?:\d+\s*%?\s*)?(?:mwst|ust|u\.?\s*st\.?|eur)?)?|endpreis|end\s*summe|zu\s*zahlen|rechnungsbetrag|prüfungsentgelt\s*gesamt|entgelt\s*gesamt|summe\s+entgelt)\s*[:\s]*(-?\s*[0-9][0-9.\s,]{0,14})\s*(?:€|eur)?/gi;

const ENTGELT_SECTION = /Entgeltinformation[\s\S]{0,1200}/i;

const AMOUNT_TOKEN = /([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+,\d{2})/;

function isPartialFeeLineLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed || /^mwst|^ust|^mehrwertsteuer/i.test(trimmed)) return false;
  if (/gesamt|endpreis|zu\s*zahlen|nettobetrag|ohne\s*mwst/i.test(trimmed)) {
    return false;
  }
  return PARTIAL_FEE_LABEL.test(trimmed);
}

/** OCR splits "Gesamtbetrag" / "inkl. MwSt" / amount across consecutive lines. */
function extractMultilineGesamtbetrag(lines: string[]): number | null {
  const ohnePattern = /gesamtbetrag\s+ohne|nettobetrag|summe\s+netto/i;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (!/^gesamtbetrag\b|^gesamt\s*:/i.test(line)) continue;
    if (ohnePattern.test(line)) continue;

    const window = lines.slice(index, index + 4).join(" ");
    if (/ohne\s*mwst|nettobetrag/i.test(window) && !/inkl/i.test(window)) {
      continue;
    }

    for (let offset = 0; offset <= 3; offset += 1) {
      const checkLine = lines[index + offset];
      if (!checkLine || ohnePattern.test(checkLine)) continue;
      const amountMatch = checkLine.match(AMOUNT_TOKEN);
      if (!amountMatch) continue;
      const value = parseFee(amountMatch[1]!);
      if (value !== null) return value;
    }
  }

  return null;
}

function extractGesamtFromSection(section: string): number | null {
  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const inklPattern =
    /gesamtbetrag\s+inkl\.?\s*(?:\d+\s*%?\s*)?(?:mwst|ust|u\.?\s*st\.?|eur)?/i;
  const ohnePattern = /gesamtbetrag\s+ohne|nettobetrag|summe\s+netto/i;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (!inklPattern.test(line)) continue;

    const inline = line.match(AMOUNT_TOKEN);
    if (inline) {
      const value = parseFee(inline[1]!);
      if (value !== null) return value;
    }

    for (let offset = 1; offset <= 3; offset += 1) {
      const next = lines[index + offset];
      if (!next || inklPattern.test(next) || ohnePattern.test(next)) continue;
      const nextAmount = next.match(AMOUNT_TOKEN);
      if (nextAmount) {
        const value = parseFee(nextAmount[1]!);
        if (value !== null) return value;
      }
    }
  }

  const multiline = extractMultilineGesamtbetrag(lines);
  if (multiline !== null) return multiline;

  const candidates: number[] = [];

  for (const match of section.matchAll(GESAMT_AMOUNT_PATTERN)) {
    const context = match[0] ?? "";
    if (/ohne\s*mwst|nettobetrag/i.test(context)) continue;
    if (/^mwst|^ust/i.test(context.trim())) continue;
    const value = parseFee(match[1] ?? "");
    if (value !== null) candidates.push(value);
  }

  for (const line of lines) {
    if (ohnePattern.test(line) || /^mwst|^ust/i.test(line)) continue;
    if (!/gesamt|endpreis|zu\s*zahlen|summe/i.test(line)) continue;
    for (const match of line.matchAll(new RegExp(`${AMOUNT_TOKEN.source}`, "g"))) {
      const value = parseFee(match[1] ?? "");
      if (value !== null) candidates.push(value);
    }
  }

  return candidates.length > 0 ? Math.max(...candidates) : null;
}

function parseFeeComponent(raw: string): number | null {
  const value = parseGermanMoneyAmount(raw);
  if (value === null || value <= 0 || value > MAX_FEE) return null;
  return value;
}

function sumPartialFeeRows(text: string): number | null {
  const rows: number[] = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || /gesamt|endpreis|zu\s*zahlen/i.test(trimmed)) continue;

    const amountMatch =
      trimmed.match(
        /([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+,\d{2})\s*(?:€|eur)?\s*$/i,
      ) ??
      trimmed.match(/([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+,\d{2})\s*(?:€|eur)?/i);
    if (!amountMatch) continue;

    const label = trimmed.slice(0, trimmed.length - amountMatch[0].length).trim();
    if (!isPartialFeeLineLabel(label)) continue;

    const value = parseFeeComponent(amountMatch[1] ?? "");
    if (value !== null) rows.push(value);
  }

  if (rows.length < 2) return null;
  const sum = Math.round(rows.reduce((acc, value) => acc + value, 0) * 100) / 100;
  return sum >= MIN_FEE && sum <= MAX_FEE ? sum : null;
}

/**
 * Extract total Prüfgebühr (Endpreis / Gesamtbetrag) from HU/AU report OCR text.
 */
export function extractTuevAmountFromText(rawText: string): number | null {
  const text = normalizeTuevOcrText(rawText);

  const entgeltMatch = text.match(ENTGELT_SECTION);
  if (entgeltMatch) {
    const fromEntgelt = extractGesamtFromSection(entgeltMatch[0]!);
    if (fromEntgelt !== null) return fromEntgelt;
  }

  const footerSlice = text.slice(Math.max(0, text.length - 2_500));
  const fromFooter = extractGesamtFromSection(footerSlice);
  if (fromFooter !== null) return fromFooter;

  const fromFull = extractGesamtFromSection(text);
  if (fromFull !== null) return fromFull;

  return sumPartialFeeRows(text);
}

/** Prefer LLM/post-process amount; enrich from OCR when missing or likely partial. */
export function preferTuevTotalAmount(
  structuredAmount: number | null | undefined,
  lineItems: InvoiceLineItem[] | null | undefined,
  rawText: string,
): number | null {
  const parsedStructured =
    structuredAmount != null && structuredAmount > 0
      ? parseTuevAmountValue(structuredAmount)
      : null;

  const fromLineItems = resolveTuevTotalAmount(parsedStructured, lineItems ?? null);
  const fromOcr = rawText.trim() ? extractTuevAmountFromText(rawText) : null;

  if (fromLineItems === null) return fromOcr;
  if (fromOcr === null) return fromLineItems;

  // LLM often returns HU line (123,81) — OCR Gesamt (125,00) wins when higher.
  if (fromOcr > fromLineItems + 0.05) return fromOcr;

  // OCR Gesamt matches line-item sum — prefer OCR label authority.
  if (Math.abs(fromOcr - fromLineItems) <= 0.05) return fromOcr;

  return fromLineItems;
}
