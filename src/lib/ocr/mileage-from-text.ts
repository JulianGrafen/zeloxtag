/**
 * Heuristic Kilometerstand / Tachostand extraction from invoice OCR text
 * and HU/AU Punkt-4 / Feld-4 sections.
 */

const MAX_KM = 9_999_999;
const MIN_PLAUSIBLE_KM = 500;

function parseKmDigits(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits || digits.length < 3 || digits.length > 7) return null;
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value < MIN_PLAUSIBLE_KM || value > MAX_KM) {
    return null;
  }
  return value;
}

/**
 * Punkt 4 / Feld 4 headers for Kilometerstand on HU/AU reports.
 * KM-Stand is always listed under section 4 — not bare "Kilometerstand" in legal text.
 */
const PUNKT4_MILEAGE_HEADER =
  /(?:^|\n)\s*(?:(?:\(?4\)?[\.)]?\s+)(?:Kilometerstand|KM[-\s]?Stand|km[-\s]?stand|Tachostand)|Feld\s+4(?:\s*[:\.]?\s*(?:Kilometerstand|KM[-\s]?Stand|km[-\s]?stand|Tachostand))?)\s*:?\s*/gi;

/** Stop before the next numbered field or Mängel section. */
const PUNKT4_SECTION_END =
  /\n\s*(?:\(?[5-9]\)?[\.)]?\s+|Feld\s+[5-9]\b|Festgestellte\s+Mängel|\(6\)|Ergebnis|Unterschrift|Seite\s+\d|n[aäe]{0,2}chste\s+(?:hu|untersuchung|hauptuntersuchung)|HU\s+fällig|Prüfplakette\s+erteilt)/i;

function slicePunkt4MileageSection(text: string): string | null {
  let lastIndex: number | null = null;
  let lastLength = 0;

  for (const match of text.matchAll(PUNKT4_MILEAGE_HEADER)) {
    if (match.index != null) {
      lastIndex = match.index;
      lastLength = match[0].length;
    }
  }

  if (lastIndex == null) return null;

  const tail = text.slice(lastIndex + lastLength);
  const endMatch = tail.search(PUNKT4_SECTION_END);
  const section = (
    endMatch >= 0 ? tail.slice(0, endMatch) : tail.slice(0, 500)
  ).trim();

  return section.length >= 1 ? section : null;
}

function parseKmFromPunkt4Section(section: string): number | null {
  const inline = section.match(/^([0-9][0-9.\s,]{2,12})\s*(?:km)?\b/i);
  if (inline) {
    const value = parseKmDigits(inline[1] ?? "");
    if (value !== null) return value;
  }

  for (const rawLine of section.split(/\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const lineValue = line.match(/^([0-9][0-9.\s,]{2,12})\s*(?:km)?\b/i);
    if (lineValue) {
      const value = parseKmDigits(lineValue[1] ?? "");
      if (value !== null) return value;
    }

    const labeled = line.match(
      /(?:kilometerstand|km[-\s]?stand|tachostand)\s*[:.]?\s*([0-9][0-9.\s,]{2,12})/i,
    );
    if (labeled) {
      const value = parseKmDigits(labeled[1] ?? "");
      if (value !== null) return value;
    }
  }

  return null;
}

/** Whether OCR text contains an explicit Punkt-4 / Feld-4 Kilometerstand section. */
export function hasTuevPunkt4MileageSection(rawText: string): boolean {
  return slicePunkt4MileageSection(rawText.replace(/\r\n/g, "\n")) !== null;
}

/** Extract KM-Stand from Punkt 4 / Feld 4 on HU/AU reports. */
export function extractTuevPunkt4MileageKm(rawText: string): number | null {
  const text = rawText.replace(/\r\n/g, "\n");
  const section = slicePunkt4MileageSection(text);
  if (!section) return null;
  return parseKmFromPunkt4Section(section);
}

/**
 * Extract odometer reading (km) from German workshop invoice OCR.
 */
export function extractMileageKmFromText(rawText: string): number | null {
  const text = rawText.replace(/\r\n/g, "\n");

  const labeledPatterns = [
    /(?:kilometerstand|km[-\s]?stand|tachostand|odometer|laufleistung|kilometer)\s*[:.]?\s*([0-9][0-9.\s]{2,12})\s*(?:km)?/gi,
    /(?:bei|aktuell(?:er)?|aktueller)?\s*(?:km|kilometer)\s*[:.]?\s*([0-9][0-9.\s]{2,12})/gi,
    /(?:^|\n)\s*km\s*[:.]?\s*([0-9][0-9.\s]{2,12})\b/gi,
    /\b([0-9]{1,3}(?:[.\s][0-9]{3})+)\s*km\b/gi,
  ];

  for (const pattern of labeledPatterns) {
    for (const match of text.matchAll(pattern)) {
      const value = parseKmDigits(match[1] ?? "");
      if (value !== null) return value;
    }
  }

  // Fallback: "67210 km" / "67.210 km" near service wording, not money.
  for (const match of text.matchAll(
    /\b([0-9]{4,7}|[0-9]{1,3}(?:\.[0-9]{3})+)\s*km\b/gi,
  )) {
    const raw = match[1] ?? "";
    // Skip values that look like money (always have ,xx in DE invoices).
    if (/,\d{2}\b/.test(match[0])) continue;
    const value = parseKmDigits(raw);
    if (value === null) continue;
    const index = match.index ?? 0;
    const context = text.slice(Math.max(0, index - 40), index + match[0].length + 20);
    if (/(?:€|eur|mwst|preis|betrag|rechnung)/i.test(context)) continue;
    return value;
  }

  return null;
}

/** Prefer structured LLM mileage; fall back to OCR heuristic. */
export function preferMileageKm(
  structured: number | null | undefined,
  rawText: string,
): number | null {
  if (
    typeof structured === "number" &&
    Number.isFinite(structured) &&
    structured >= MIN_PLAUSIBLE_KM &&
    structured <= MAX_KM
  ) {
    return Math.round(structured);
  }
  return extractMileageKmFromText(rawText);
}

/**
 * Hybrid TÜV mileage: Punkt 4 / Feld 4 > document header (Kopf) > vision LLM.
 */
export function preferTuevHeaderMileageKm(
  llmKm: number | null | undefined,
  rawText: string,
): number | null {
  const punkt4 = extractTuevPunkt4MileageKm(rawText);
  if (punkt4 !== null) return punkt4;

  const header = extractMileageKmFromText(rawText);
  if (header !== null) return header;

  if (
    typeof llmKm === "number" &&
    Number.isFinite(llmKm) &&
    llmKm >= MIN_PLAUSIBLE_KM &&
    llmKm <= MAX_KM
  ) {
    return Math.round(llmKm);
  }

  return null;
}
