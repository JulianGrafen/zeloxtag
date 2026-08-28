/**
 * Infer workshop / vendor name from OCR header lines and logo-like text.
 * Logos often OCR as the first short lines at the top of page 1.
 */

import { stripHtmlTags } from "@/lib/ocr/normalize-ocr-markdown";

const SKIP_LINE =
  /^(rechnung|invoice|quittung|beleg|kassenbon|lieferschein|gutschrift|tax|mwst|ust\.?|datum|date|seite|page|tel\.?|fax|mobil|email|e-mail|www\.|http|iban|bic|ust-?id|steuer|kunde|customer|bill\s*to|ship\s*to|zahlungsziel|fällig|netto|brutto|summe|gesamt|total|zwischensumme|pos\.?|artikel|beschreibung|menge|einzeln|eur|€|\$)/i;

const LOOKS_LIKE_ADDRESS =
  /^\d{4,5}\s+\p{L}|^straße\b|^strasse\b|^weg\b|^platz\b|^\d+\s*[a-z]?\s*$/iu;

const LOOKS_LIKE_CODE =
  /^[\d\s./:+-]{4,}$|^[A-Z0-9]{2,}[-_/][A-Z0-9-_/]+$/;

const COMPANY_HINT =
  /\b(gmbh|gbr|ag|kg|ug|e\.?\s?k\.?|ltd|llc|inc|co\.|werkstatt|garage|motorsport|tuning|autoservice|kfz|service|parts|performance)\b/i;

const GENERIC_VENDOR =
  /^(rechnung|invoice|quittung|beleg|kassenbon|lieferschein|gutschrift|werkstatt|service|kunde|customer|anbieter|firma|unternehmen)$/i;

function cleanLine(line: string): string {
  return stripHtmlTags(line).replace(/\s+/g, " ").trim();
}

/** Block document-type labels and other non-vendor placeholders from LLM output. */
export function isGenericInvoiceVendor(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return true;
  return GENERIC_VENDOR.test(trimmed);
}

export function isPlausibleVendorLine(line: string): boolean {
  const value = cleanLine(line);
  if (value.length < 2 || value.length > 80) return false;
  if (isGenericInvoiceVendor(value)) return false;
  if (SKIP_LINE.test(value)) return false;
  if (LOOKS_LIKE_ADDRESS.test(value)) return false;
  if (LOOKS_LIKE_CODE.test(value)) return false;
  if (!/\p{L}{2,}/u.test(value)) return false;
  if (/^\d+[.,]\d{2}\s*€?$/.test(value)) return false;
  return true;
}

/**
 * Pick the best workshop/brand candidate from early OCR lines.
 */
export function inferVendorFromHeaderText(rawText: string): string | null {
  const lines = rawText
    .split(/\n+/)
    .map(cleanLine)
    .filter(Boolean)
    .filter((line) => !/^---\s*Seite\s+\d+/i.test(line));

  const header = lines.slice(0, 12).filter(isPlausibleVendorLine);
  if (header.length === 0) return null;

  const withCompanyHint = header.find((line) => COMPANY_HINT.test(line));
  if (withCompanyHint) return withCompanyHint.slice(0, 160);

  const brandLike = header.find((line) => {
    const words = line.split(/\s+/);
    return words.length <= 5 && line.length <= 40;
  });
  return (brandLike ?? header[0]).slice(0, 160);
}

/**
 * Merge vendor sources. Vision/logo beat generic structured fields —
 * stylized logos are often missing from VendorName.
 */
export function resolveVendorName(input: {
  structuredVendor: string | null;
  logoCandidates: Array<string | null | undefined>;
  visionVendor?: string | null;
  rawText: string;
}): string | null {
  const vision = input.visionVendor?.trim() || null;
  if (vision && isPlausibleVendorLine(vision)) {
    return cleanLine(vision).slice(0, 160);
  }

  for (const candidate of input.logoCandidates) {
    const value = candidate?.trim();
    if (value && isPlausibleVendorLine(value)) {
      return cleanLine(value).slice(0, 160);
    }
  }

  const structured = input.structuredVendor?.trim() || null;
  if (
    structured &&
    !isGenericInvoiceVendor(structured) &&
    isPlausibleVendorLine(structured)
  ) {
    return cleanLine(structured).slice(0, 160);
  }

  return inferVendorFromHeaderText(input.rawText);
}
