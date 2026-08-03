/**
 * Extract Bauteil / brand+part for ABE & Teilegutachten OCR text.
 * Examples: "OZ Felgen", "Milltek Auspuff", "Tein Sportfedern".
 */

const SKIP_LINE =
  /^(allgemeine\s+betriebserlaubnis|\babe\b|teilegutachten|gutachten|seite|page|anlage|anlage\s*\d+|tel\.?|fax|www\.|http|iban|bic|kba|kraftfahrt|bundesamt|tüv|tuev|dekra|küs|kus|gtü|gtue|datum|ausgestellt|gültig|gueltig|auflage|hinweis|fahrzeug|fzg\.?)/i;

/** Well-known aftermarket brands that appear on ABE / Teilegutachten. */
const PART_BRANDS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bmilltek\b/i, label: "Milltek" },
  { pattern: /\bakrapovi[cčć]\b|\bakrapovic\b/i, label: "Akrapovič" },
  { pattern: /\bremus\b/i, label: "Remus" },
  { pattern: /\beisenmann\b/i, label: "Eisenmann" },
  { pattern: /\bsupersprint\b/i, label: "Supersprint" },
  { pattern: /\bfriedrich\s*motorsport\b/i, label: "Friedrich Motorsport" },
  { pattern: /\boz(?:\s+racing|\s+ultraleggera)?\b/i, label: "OZ" },
  { pattern: /\bbbs\b/i, label: "BBS" },
  { pattern: /\brays\b|\bvolk\s*te37\b|\bte37\b/i, label: "RAYS" },
  { pattern: /\benkei\b/i, label: "Enkei" },
  { pattern: /\brotiform\b/i, label: "Rotiform" },
  { pattern: /\btein\b/i, label: "Tein" },
  { pattern: /\bkw(?:\s+suspensions?)?\b/i, label: "KW" },
  { pattern: /\bh\s*&\s*r\b|\bhundr\b/i, label: "H&R" },
  { pattern: /\bbilstein\b/i, label: "Bilstein" },
  { pattern: /\beibach\b/i, label: "Eibach" },
  { pattern: /\bst\s*suspensions?\b/i, label: "ST Suspensions" },
  { pattern: /\beventuri\b/i, label: "Eventuri" },
  { pattern: /\binjen\b/i, label: "Injen" },
  { pattern: /\bautoexe\b/i, label: "AutoExe" },
  { pattern: /\bmazdaspeed\b/i, label: "Mazdaspeed" },
  { pattern: /\bseibon\b/i, label: "Seibon" },
  { pattern: /\bapr\b/i, label: "APR" },
  { pattern: /\bwagner\b/i, label: "Wagner" },
  { pattern: /\bforge\b/i, label: "Forge" },
  { pattern: /\bgreddy\b|\btrust\b/i, label: "Greddy" },
  { pattern: /\bhks\b/i, label: "HKS" },
  { pattern: /\bcarbon\s*cleaning\b/i, label: "Carbon" },
];

const PART_TYPES: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern:
      /\bleichtmetallr[aä]der\b|\bleichtmetallfelgen\b|\bfelgen?\b|\br[aä]der\b|\brad[-\s]?reifen/i,
    label: "Felgen",
  },
  { pattern: /\bsportauspuff\b/i, label: "Sportauspuff" },
  {
    pattern:
      /\babgasanlage\b|\bauspuffanlage\b|\bauspuff\b|\bdownpipe\b|\bkat[-\s]?ersatz\b/i,
    label: "Auspuff",
  },
  { pattern: /\bgewindefahrwerk\b/i, label: "Gewindefahrwerk" },
  { pattern: /\bsportfedern?\b|\bfahrwerksfedern?\b/i, label: "Sportfedern" },
  { pattern: /\bfahrwerk\b|\btieferlegung\b|\bfedern?\b/i, label: "Fahrwerk" },
  {
    pattern:
      /\bfrontlippe\b|\bfrontspoiler\b|\bheckspoiler\b|\bheckflügel\b|\bheckfluegel\b|\bspoiler\b|\bdiffuser\b|\bseitenschweller\b/i,
    label: "Aerodynamik",
  },
  {
    pattern: /\bansaugung\b|\bluftfilter\b|\bcold\s*air\b|\bainnahme\b/i,
    label: "Ansaugung",
  },
  {
    pattern: /\bintercooler\b|\bladeluftkühler\b|\bladeluftkuehler\b/i,
    label: "Intercooler",
  },
  { pattern: /\bbremss[aä]tze?\b|\bbig\s*brake\b|\bbremsscheiben?\b/i, label: "Bremsen" },
];

/** Labeled fields often printed on German ABE / Teilegutachten. */
const LABELED_PART_FIELD =
  /(?:gegenstand|handelsbezeichnung|teilebezeichnung|bauteil|bezeichnung|typ(?:enbezeichnung)?|artikel|marke)\s*[:.]?\s*(.+)/i;

function cleanLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function findBrand(text: string): string | null {
  for (const brand of PART_BRANDS) {
    if (brand.pattern.test(text)) return brand.label;
  }
  return null;
}

function findPartType(text: string): string | null {
  for (const part of PART_TYPES) {
    if (part.pattern.test(text)) return part.label;
  }
  return null;
}

function fromLabeledFields(text: string): string | null {
  const lines = text.split(/\n+/).map(cleanLine).filter(Boolean);
  for (const line of lines.slice(0, 40)) {
    const match = line.match(LABELED_PART_FIELD);
    if (!match?.[1]) continue;
    let value = match[1].replace(/\s+/g, " ").trim();
    value = value.replace(/\s*[|;].*$/, "").trim();
    if (value.length < 2 || value.length > 80) continue;
    if (SKIP_LINE.test(value)) continue;
    if (/^\d{4,}/.test(value)) continue;

    const brand = findBrand(value);
    const type = findPartType(value) ?? findPartType(text);
    if (brand && type) return `${brand} ${type}`.slice(0, 160);
    if (brand) return brand.slice(0, 160);
    if (value.split(/\s+/).length <= 8) return value.slice(0, 160);
  }
  return null;
}

function composePartName(brand: string | null, type: string | null): string | null {
  if (brand && type) return `${brand} ${type}`;
  if (brand) return brand;
  if (type) return type;
  return null;
}

function isPlausiblePartName(value: string): boolean {
  const cleaned = cleanLine(value);
  if (cleaned.length < 2 || cleaned.length > 80) return false;
  if (SKIP_LINE.test(cleaned)) return false;
  if (/^\d+[.,]\d{2}/.test(cleaned)) return false;
  if (!/\p{L}{2,}/u.test(cleaned)) return false;
  return true;
}

/**
 * Infer Bauteil name from ABE OCR text.
 * Prefers "Marke + Kategorie" (e.g. Milltek Auspuff, OZ Felgen).
 */
export function extractAbePartName(rawText: string): string | null {
  const text = rawText.replace(/\s+/g, " ").trim();
  if (text.length < 8) return null;

  const labeled = fromLabeledFields(rawText);
  if (labeled) return labeled;

  const brand = findBrand(text);
  const type = findPartType(text);
  const composed = composePartName(brand, type);
  if (composed) return composed.slice(0, 160);

  // Fallback: short brand-like header line that is not bureaucratic boilerplate.
  const header = rawText
    .split(/\n+/)
    .map(cleanLine)
    .filter(Boolean)
    .filter((line) => !SKIP_LINE.test(line))
    .filter((line) => !/^---\s*Seite/i.test(line))
    .slice(0, 15);

  for (const line of header) {
    if (!isPlausiblePartName(line)) continue;
    const words = line.split(/\s+/);
    if (words.length <= 6 && line.length <= 48) {
      return line.slice(0, 160);
    }
  }

  return null;
}

/**
 * Prefer LLM Bauteil when it already looks like a part/brand name;
 * otherwise fall back to heuristic extraction.
 */
export function resolveAbePartName(input: {
  structuredPart: string | null;
  rawText: string;
}): string | null {
  const structured = input.structuredPart?.trim() || null;
  if (structured && isPlausiblePartName(structured)) {
    const brand = findBrand(structured) ?? findBrand(input.rawText);
    const type = findPartType(structured) ?? findPartType(input.rawText);
    // Enrich "OZ" → "OZ Felgen" when type is known from the document.
    if (brand && type && !new RegExp(type, "i").test(structured)) {
      return `${brand} ${type}`.slice(0, 160);
    }
    if (brand && structured.length <= 40) {
      return (type && structured.toLowerCase() === brand.toLowerCase()
        ? `${brand} ${type}`
        : structured
      ).slice(0, 160);
    }
    return structured.slice(0, 160);
  }

  return extractAbePartName(input.rawText);
}
