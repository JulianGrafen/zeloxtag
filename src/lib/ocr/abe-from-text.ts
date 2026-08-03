/**
 * Heuristic ABE field extraction (KBA, vehicle fitment, Auflagen) from OCR text.
 */

import {
  ABE_CONDITION_MAX_ITEMS,
  ABE_CONDITION_MAX_LENGTH,
  normalizeAbeDate,
} from "./abe-parse-schema";

const KBA_PATTERNS = [
  /\b(?:ABE[-\s]?(?:Nr\.?|Nummer)?|KBA[-\s]?(?:Nr\.?|Nummer)?|Genehmigungs(?:nr\.?|nummer)|Zulassungs(?:nr\.?|nummer))\s*[:.]?\s*([A-Z0-9][A-Z0-9./\- ]{2,40})/i,
  /\b((?:ABE|KBA)\s*\d{3,8}[A-Z0-9./\-]*)\b/i,
  /\b(e\s*\d\s*\*?\s*\d{2,4}\s*\/\s*\d{2,6}\s*\*?\s*\d{2,6})\b/i,
];

const VEHICLE_LINE =
  /(?:^|\n)\s*(?:fahrzeug(?:e|typ(?:en)?)?|freigabe(?:n)?|geeignet\s+für|gilt\s+für|anwendbar\s+für|typliste|fahrzeugliste)\s*[:.]?\s*(.+)/gi;

const LOOKS_LIKE_VEHICLE =
  /\b(mazda|bmw|audi|mercedes|vw|volkswagen|porsche|toyota|honda|nissan|ford|opel|skoda|seat|hyundai|kia|volvo|subaru|mitsubishi|lexus|mini|alfa|fiat|peugeot|citroen|renault|cupra|tesla|rx-?\d|m\d|e\d{2}|f\d{2}|g\d{2}|a\d{1,2}|s\d{1,2}|golf|passat|polo|caddy|transporter)\b/i;

/** Heading that starts an Auflagen / Hinweise block. */
const AUFLAGEN_HEADING =
  /(?:^|\n)\s*((?:besondere\s+)?auflagen?(?:\s*(?:\/|,|und)\s*hinweise?)?|hinweise(?:\s*(?:\/|,|und)\s*auflagen?)?|bedingungen)\b/i;

const AUFLAGEN_SECTION_END =
  /\n\s*(?:verwendungsbereich|fahrzeugliste|typliste|typenschlüssel|unterschrift|genehmigungszeichen)\b/i;

/** Numbered / lettered Auflage marker at line start. */
const CONDITION_MARKER =
  /(?:^|\n)\s*(?:auflage\s*)?(?:\(?\d{1,2}(?:\.\d{1,2})?\)|[1-9]\d?(?:\.\d{1,2})?[\.)]|[IVXLC]{1,4}\.|[a-z]\))\s+/gi;

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function extractKbaNumber(rawText: string): string | null {
  for (const pattern of KBA_PATTERNS) {
    const match = rawText.match(pattern);
    const value = match?.[1] ? clean(match[1]) : null;
    if (!value) continue;
    if (value.length < 3 || value.length > 80) continue;
    if (/^(seite|page|datum|tel)/i.test(value)) continue;
    return value.slice(0, 80);
  }
  return null;
}

export function extractVehicleApprovals(rawText: string): string[] | null {
  const found = new Set<string>();

  for (const match of rawText.matchAll(VEHICLE_LINE)) {
    const chunk = match[1];
    if (!chunk) continue;
    for (const part of chunk.split(/[,;|/]/)) {
      const value = clean(part).replace(/\.$/, "");
      if (value.length < 3 || value.length > 120) continue;
      if (LOOKS_LIKE_VEHICLE.test(value) || /\b\d{3,4}\b/.test(value)) {
        found.add(value.slice(0, 120));
      }
    }
  }

  // Fallback: collect short lines that look like vehicle models.
  if (found.size === 0) {
    for (const line of rawText.split(/\n+/).map(clean).filter(Boolean)) {
      if (line.length > 80) continue;
      if (!LOOKS_LIKE_VEHICLE.test(line)) continue;
      if (/betriebserlaubnis|teilegutachten|auflage|hinweis/i.test(line)) {
        continue;
      }
      found.add(line.slice(0, 120));
      if (found.size >= 12) break;
    }
  }

  const list = [...found].slice(0, 40);
  return list.length > 0 ? list : null;
}

/**
 * Drop bulky Verwendungsbereich / fitment tables before LLM / budget cuts.
 * Never discards trailing Auflagen blocks.
 */
export function stripAbeFitmentSections(rawText: string): string {
  const text = rawText.replace(/\r\n/g, "\n");
  const start = text.search(/verwendungsbereich/i);
  if (start < 0) return text;

  const tail = text.slice(start);
  const resume = tail.search(AUFLAGEN_HEADING);

  if (resume >= 0) {
    return `${text.slice(0, start)}\n${tail.slice(resume)}`.trim();
  }

  // No clear Auflagen heading after fitment — keep full text so Auflagen
  // that sit inside/after the table are not deleted.
  return text;
}

/**
 * Keep OCR text under a char budget without chopping off Auflagen.
 * Prefer: strip fitment → keep head metadata + Auflagen section / document tail.
 */
export function budgetAbeOcrText(rawText: string, maxChars: number): string {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  if (normalized.length <= maxChars) return normalized;

  const stripped = stripAbeFitmentSections(normalized);
  if (stripped.length <= maxChars) return stripped;

  const headingAt = stripped.search(AUFLAGEN_HEADING);
  if (headingAt >= 0) {
    const headBudget = Math.min(
      Math.floor(maxChars * 0.4),
      Math.max(800, headingAt),
    );
    const head = stripped.slice(0, Math.min(headBudget, headingAt)).trimEnd();
    const tailBudget = maxChars - head.length - 8;
    const tail = stripped.slice(headingAt, headingAt + Math.max(tailBudget, 0));
    return `${head}\n\n…\n\n${tail}`.trim().slice(0, maxChars);
  }

  // No heading found — keep head (KBA/manufacturer) + tail (often Auflagen).
  const headBudget = Math.floor(maxChars * 0.45);
  const tailBudget = maxChars - headBudget - 8;
  return `${stripped.slice(0, headBudget)}\n\n…\n\n${stripped.slice(-tailBudget)}`
    .trim()
    .slice(0, maxChars);
}

function findAuflagenBody(text: string): string {
  const match = text.match(
    new RegExp(
      `${AUFLAGEN_HEADING.source}\\s*[:.]?\\s*([\\s\\S]{8,20000})`,
      "i",
    ),
  );
  let body = match?.[2] ?? "";
  if (!body) return "";
  body = body.split(AUFLAGEN_SECTION_END)[0] ?? body;
  return body.trim();
}

function collectNumberedConditions(source: string): string[] {
  const items: string[] = [];
  // Fresh regex — avoid sticky lastIndex from the module-level /g pattern.
  const marker = new RegExp(CONDITION_MARKER.source, "gi");
  const matches = [...source.matchAll(marker)];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    if (match.index === undefined) continue;
    const contentStart = match.index + match[0].length;
    const contentEnd =
      index + 1 < matches.length && matches[index + 1].index !== undefined
        ? matches[index + 1].index!
        : source.length;
    const value = clean(source.slice(contentStart, contentEnd));
    if (!isPlausibleCondition(value)) continue;
    items.push(value.slice(0, ABE_CONDITION_MAX_LENGTH));
    if (items.length >= ABE_CONDITION_MAX_ITEMS) break;
  }

  return items;
}

function collectBulletConditions(source: string): string[] {
  const items: string[] = [];
  for (const line of source.split(/\n+/)) {
    const bullet = line.match(/^\s*[-•*–—]\s+(.+)/);
    if (!bullet?.[1]) continue;
    const value = clean(bullet[1]);
    if (!isPlausibleCondition(value)) continue;
    items.push(value.slice(0, ABE_CONDITION_MAX_LENGTH));
    if (items.length >= ABE_CONDITION_MAX_ITEMS) break;
  }
  return items;
}

function collectParagraphConditions(source: string): string[] {
  const items: string[] = [];
  for (const block of source.split(/\n{2,}/)) {
    const value = clean(block);
    if (!isPlausibleCondition(value)) continue;
    // Skip leftover table / header noise inside the section.
    if (/^(seite|page|typ|eg-typ|fahrzeug)\b/i.test(value)) continue;
    if (value.length < 40) continue;
    items.push(value.slice(0, ABE_CONDITION_MAX_LENGTH));
    if (items.length >= ABE_CONDITION_MAX_ITEMS) break;
  }
  return items;
}

/**
 * Pull fully worded Auflagen from OCR text when the LLM returns nothing.
 * Looks for Auflagen-/Hinweise-sections and numbered / bulleted items.
 */
export function extractAbeConditionsFromText(rawText: string): string[] | null {
  const text = rawText.replace(/\r\n/g, "\n");
  const body = findAuflagenBody(text);
  const source = body || text;

  let items = collectNumberedConditions(source);

  if (items.length === 0) {
    items = collectBulletConditions(source);
  }

  if (items.length === 0 && body) {
    // Section found but unnumbered — keep substantial paragraphs.
    items = collectParagraphConditions(body);
  }

  if (items.length === 0) {
    for (const match of text.matchAll(
      /(?:^|\n)\s*auflage(?:\s*\d+)?\s*[:.]\s*([^\n]{12,400}(?:\n(?!\s*auflage)[^\n]+)*)/gi,
    )) {
      const value = clean(match[1] ?? "");
      if (!isPlausibleCondition(value)) continue;
      items.push(value.slice(0, ABE_CONDITION_MAX_LENGTH));
      if (items.length >= ABE_CONDITION_MAX_ITEMS) break;
    }
  }

  return items.length > 0 ? items : null;
}

function isPlausibleCondition(value: string): boolean {
  if (value.length < 12 || value.length > ABE_CONDITION_MAX_LENGTH) return false;
  if (/^(seite|page|tel|fax|datum|kba|abe)\b/i.test(value)) return false;
  if (/^verwendungsbereich\b/i.test(value)) return false;
  // Reject pure vehicle / type-code table rows.
  if (/^[A-Z0-9][A-Z0-9\s./\-]{0,40}$/.test(value) && value.length < 50) {
    return false;
  }
  return /[a-zäöüß]/i.test(value);
}

/** Prefer the more complete Auflagen set (LLM vs heuristic). */
export function preferAbeConditions(
  primary: string[] | null | undefined,
  fallback: string[] | null | undefined,
): string[] | null {
  const a = primary?.map((v) => clean(v)).filter(isPlausibleCondition) ?? [];
  const b = fallback?.map((v) => clean(v)).filter(isPlausibleCondition) ?? [];
  if (a.length === 0) return b.length > 0 ? b.slice(0, ABE_CONDITION_MAX_ITEMS) : null;
  if (b.length === 0) return a.slice(0, ABE_CONDITION_MAX_ITEMS);

  const aChars = a.reduce((sum, item) => sum + item.length, 0);
  const bChars = b.reduce((sum, item) => sum + item.length, 0);
  // Heuristic wins only if clearly more complete.
  if (b.length >= a.length + 1 || bChars > aChars * 1.25) {
    return b.slice(0, ABE_CONDITION_MAX_ITEMS);
  }
  return a.slice(0, ABE_CONDITION_MAX_ITEMS);
}

export function resolveAbeFields(input: {
  structuredKba: string | null;
  structuredApprovals: string[] | null;
  rawText: string;
}): {
  kbaNumber: string | null;
  vehicleApprovals: string[] | null;
} {
  const kbaNumber =
    input.structuredKba?.trim().slice(0, 80) ||
    extractKbaNumber(input.rawText);

  const vehicleApprovals =
    input.structuredApprovals && input.structuredApprovals.length > 0
      ? input.structuredApprovals.map((v) => v.trim().slice(0, 120)).filter(Boolean)
      : extractVehicleApprovals(input.rawText);

  return {
    kbaNumber: kbaNumber || null,
    vehicleApprovals:
      vehicleApprovals && vehicleApprovals.length > 0
        ? vehicleApprovals.slice(0, 40)
        : null,
  };
}

const GERMAN_MONTHS: Record<string, number> = {
  januar: 1,
  jan: 1,
  februar: 2,
  feb: 2,
  märz: 3,
  maerz: 3,
  mar: 3,
  april: 4,
  apr: 4,
  mai: 5,
  juni: 6,
  jun: 6,
  juli: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  oktober: 10,
  okt: 10,
  november: 11,
  nov: 11,
  dezember: 12,
  dez: 12,
};

function toIsoDate(year: number, month: number, day: number): string | null {
  if (year < 1980 || year > 2100) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return normalizeAbeDate(iso);
}

/**
 * Extract Ausstellung-/Gutachtendatum from ABE OCR text → YYYY-MM-DD.
 */
export function extractAbeDateFromText(rawText: string): string | null {
  const text = rawText.replace(/\r\n/g, "\n");

  const labeled = [
    ...text.matchAll(
      /(?:^|\n)\s*(?:ausstellungs(?:datum)?|gutachten(?:datum)?|datum(?:\s+der\s+ausstellung)?|ausgestellt\s+am|erstellt\s+am|date)\s*[:.]?\s*([^\n]{6,40})/gi,
    ),
  ];
  for (const match of labeled) {
    const parsed = parseGermanDateChunk(match[1] ?? "");
    if (parsed) return parsed;
  }

  // Fallback: first plausible German date in the document head.
  const head = text.slice(0, 2_500);
  for (const match of head.matchAll(
    /\b(\d{1,2})[./](\d{1,2})[./](\d{2,4})\b/g,
  )) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    const iso = toIsoDate(year, month, day);
    if (iso) return iso;
  }

  for (const match of head.matchAll(
    /\b(\d{1,2})\.?\s+([A-Za-zÄÖÜäöüß]{3,9})\s+(\d{4})\b/g,
  )) {
    const day = Number(match[1]);
    const month = GERMAN_MONTHS[(match[2] ?? "").toLowerCase()];
    const year = Number(match[3]);
    if (!month) continue;
    const iso = toIsoDate(year, month, day);
    if (iso) return iso;
  }

  return null;
}

function parseGermanDateChunk(chunk: string): string | null {
  const value = clean(chunk);
  if (!value) return null;

  const numeric = value.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{2,4})\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    let year = Number(numeric[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return toIsoDate(year, month, day);
  }

  const named = value.match(
    /\b(\d{1,2})\.?\s+([A-Za-zÄÖÜäöüß]{3,9})\s+(\d{4})\b/,
  );
  if (named) {
    const day = Number(named[1]);
    const month = GERMAN_MONTHS[(named[2] ?? "").toLowerCase()];
    const year = Number(named[3]);
    if (!month) return null;
    return toIsoDate(year, month, day);
  }

  const iso = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  return null;
}

/** Prefer structured date; fall back to OCR heuristic. */
export function preferAbeDate(
  structured: string | null | undefined,
  rawText: string,
): string | null {
  return normalizeAbeDate(structured) ?? extractAbeDateFromText(rawText);
}

/** Labels that identify the part manufacturer / mark (Herstellerzeichen). */
const MANUFACTURER_LABEL =
  /(?:^|\n)\s*(?:hersteller(?:zeichen)?|hersteller\s*(?:\/|,|und)\s*marke|fabrikant|fertiger(?:werk)?)\s*[:.]?\s*([^\n]{2,120})/gi;

/**
 * Labels that look similar but are NOT the manufacturer
 * (Auftraggeber, Antragsteller, Importeur, …).
 */
const NON_MANUFACTURER_LABEL =
  /(?:^|\n)\s*(?:auftraggeber|antragsteller|besteller|inverkehrbringer|importeur|vertreiber|vertrieb|händler|haendler|kunde|antragssteller)\s*[:.]?\s*([^\n]{2,120})/gi;

function normalizeManufacturerName(value: string): string {
  return clean(value)
    .replace(/^["'„“]+|["'„“]+$/g, "")
    .replace(/\s*[;,]\s*$/, "")
    .slice(0, 120);
}

function manufacturerKey(value: string): string {
  return normalizeManufacturerName(value).toLowerCase();
}

/** Collect names printed under Auftraggeber / Antragsteller / … */
export function extractAbeNonManufacturerNames(rawText: string): string[] {
  const text = rawText.replace(/\r\n/g, "\n");
  const found: string[] = [];
  for (const match of text.matchAll(NON_MANUFACTURER_LABEL)) {
    const value = normalizeManufacturerName(match[1] ?? "");
    if (value.length < 2) continue;
    if (/^(seite|page|tel|fax|datum)$/i.test(value)) continue;
    found.push(value);
  }
  return found;
}

/**
 * Extract Hersteller / Herstellerzeichen — never Auftraggeber.
 */
export function extractAbeManufacturerFromText(rawText: string): string | null {
  const text = rawText.replace(/\r\n/g, "\n");
  const rejected = new Set(
    extractAbeNonManufacturerNames(text).map(manufacturerKey),
  );

  for (const match of text.matchAll(MANUFACTURER_LABEL)) {
    const value = normalizeManufacturerName(match[1] ?? "");
    if (value.length < 2 || value.length > 120) continue;
    if (/^(seite|page|tel|fax|datum|kba|abe)$/i.test(value)) continue;
    if (rejected.has(manufacturerKey(value))) continue;
    // Avoid grabbing a following field label as the value.
    if (/^(auftraggeber|antragsteller|verwendungsbereich|auflage)/i.test(value)) {
      continue;
    }
    return value;
  }

  return null;
}

/**
 * Prefer a structured manufacturer only if it is not an Auftraggeber value.
 * Heuristic Hersteller-/Herstellerzeichen labels win over mistaken LLM values.
 */
export function preferAbeManufacturer(
  structured: string | null | undefined,
  rawText: string,
): string | null {
  const heuristic = extractAbeManufacturerFromText(rawText);
  const rejected = new Set(
    extractAbeNonManufacturerNames(rawText).map(manufacturerKey),
  );

  const structuredClean = structured
    ? normalizeManufacturerName(structured)
    : null;

  if (structuredClean && rejected.has(manufacturerKey(structuredClean))) {
    return heuristic;
  }

  // Explicit Hersteller label in the document is authoritative.
  if (heuristic) {
    if (
      !structuredClean ||
      manufacturerKey(structuredClean) === manufacturerKey(heuristic) ||
      rejected.has(manufacturerKey(structuredClean))
    ) {
      return heuristic;
    }
    // Both present and different — keep Hersteller label.
    return heuristic;
  }

  if (structuredClean && !rejected.has(manufacturerKey(structuredClean))) {
    return structuredClean;
  }

  return null;
}
