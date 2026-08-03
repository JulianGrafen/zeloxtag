/**
 * Heuristic ABE field extraction (KBA number + vehicle fitment) from OCR text.
 */

import { normalizeKbaNumber } from "./abe-parse-schema";

const KBA_PATTERNS = [
  // Classic German ABE: KBA + 5 digits (allow OCR noise around K.B.A.)
  /\bK\.?\s*B\.?\s*A\.?\s*[-]?\s*(?:Nr\.?|Nummer)?\s*[:.]?\s*(\d{5})\b/i,
  // ABE-Nr. / ABE Nummer → often followed by KBA ##### or bare #####
  /\bABE[-\s]?(?:Nr\.?|Nummer)?\s*[:.]?\s*(?:KBA\s*)?(\d{5})\b/i,
  // Combined token forms
  /\b((?:ABE|KBA)\s+\d{3,8}[A-Z0-9./\-]*)\b/i,
  // Labeled approval / registration numbers
  /\b(?:Genehmigungs(?:nr\.?|nummer|zeichen)|Zulassungs(?:nr\.?|nummer)|Nummer\s+der\s+(?:Allgemeinen\s+)?Betriebserlaubnis)\s*[:.]?\s*(?:KBA\s*)?([A-Z0-9][A-Z0-9./\- ]{2,40})/i,
  // ECE / e-mark style
  /\b(e\s*\d\s*\*?\s*\d{2,4}\s*\/\s*\d{2,6}\s*\*?\s*\d{2,6}(?:\s*\*?\s*\d{1,4})?)\b/i,
];

const MAKE_PATTERN =
  /\b(mazda|bmw|audi|mercedes(?:-benz)?|vw|volkswagen|porsche|toyota|honda|nissan|ford|opel|skoda|škoda|seat|hyundai|kia|volvo|subaru|mitsubishi|lexus|mini|alfa(?:\s*romeo)?|fiat|peugeot|citroen|citroën|renault|cupra|tesla|suzuki|dacia|jeep|land\s*rover|jaguar|chevrolet|dodge|bentley|aston\s*martin|maserati|ferrari|lamborghini|mclaren|smart|ssangyong|isuzu|cadillac|chrysler|infiniti|acura|genesis)\b/i;

const MODEL_HINT =
  /\b(rx-?\d|mx-?\d|cx-?\d|[a-z]\d{1,2}|m\d|x[1-7]|i\d|\d{2,3}[iieds]?|golf|passat|polo|civic|clio|yaris|leon|ibiza|octavia|astra|corsa|focus|fiesta|mustang|911|cayenne|macan|spirit\s*r|touring|touran|avant|sportback|gran\s*coupe)\b/i;

/** Wheel / type-approval / measurement noise — never a Freigabe entry. */
const TECH_SPEC =
  /\b(et\s*-?\s*\d|einpresstiefe|lochkreis|felgen(?:durchmesser|gr[oö]sse|breite)?|rad(?:last|gr[oö]sse)|abrollumfang|reifendruck|reifengr|zoll|gesamtgewicht|achslast|hubraum|nennleistung|technische\s+daten|eg[-\s]?be|typgenehmigungs|fahrgestell|vin\b|ccm\b|\bkw\b|\bps\b|\bmm\b|\bkg\b)\b/i;

const BOILERPLATE_APPROVAL =
  /^(betriebserlaubnis|teilegutachten|verwendungsbereich|auflage|auflagen|hinweis|seite\s*\d+|fahrzeughersteller|fahrzeugtyp|handelsbezeichnung|fahrzeugmodell|geeignet\s+für|gilt\s+für)$/i;

const MAKE_LABEL =
  /^(?:fahrzeughersteller|hersteller\s*(?:des\s*fahrzeugs)?|fahrzeugmarke|make)\s*[:.]?\s*(.+)$/i;

const MODEL_LABEL =
  /^(?:handelsbezeichnung|fahrzeugmodell(?:e)?|modell(?:bezeichnung)?|verkaufsbezeichnung|type\s*designation)\s*[:.]?\s*(.+)$/i;

const ABE_DOCUMENT_HINT =
  /\ballgemeine\s+betriebserlaubnis\b|\bteilegutachten\b|\b§\s*22\b|\babe[-\s]?nr|\bk\.?\s*b\.?\s*a\.?\b/i;

const MAKE_CANONICAL: Record<string, string> = {
  bmw: "BMW",
  vw: "VW",
  volkswagen: "VW",
  "mercedes-benz": "Mercedes-Benz",
  mercedes: "Mercedes-Benz",
  "alfa romeo": "Alfa Romeo",
  "land rover": "Land Rover",
  skoda: "Škoda",
  škoda: "Škoda",
  citroen: "Citroën",
  citroën: "Citroën",
  mini: "MINI",
  cupra: "CUPRA",
  kia: "Kia",
  mg: "MG",
};

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function titleCaseMake(value: string): string {
  return value
    .split(/(\s+|-)/)
    .map((part) => {
      if (part === " " || part === "-") return part;
      if (part.length <= 3 && part === part.toUpperCase()) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

function canonicalMake(raw: string): string {
  const key = clean(raw).toLowerCase().replace(/\s+/g, " ");
  if (MAKE_CANONICAL[key]) return MAKE_CANONICAL[key];
  const match = raw.match(MAKE_PATTERN);
  if (match?.[1]) {
    const found = match[1].toLowerCase().replace(/\s+/g, " ");
    if (MAKE_CANONICAL[found]) return MAKE_CANONICAL[found];
    return titleCaseMake(match[1]);
  }
  return titleCaseMake(clean(raw));
}

function isTechSpec(value: string): boolean {
  const trimmed = clean(value);
  if (!trimmed) return true;
  if (TECH_SPEC.test(trimmed)) return true;
  if (/^e\s*\d+\s*\*/i.test(trimmed)) return true;
  if (/^\d+\s*x\s*\d+/i.test(trimmed)) return true;
  if (/^\d+([.,]\d+)?\s*(mm|kg|zoll|″|"|kw|ps|ccm)$/i.test(trimmed)) {
    return true;
  }
  if (/^(et|lk|ra|au)\s*-?\s*\d+/i.test(trimmed)) return true;
  return false;
}

function stripFieldLabel(value: string): string {
  return clean(value)
    .replace(
      /^(?:fahrzeughersteller|fahrzeugtyp|handelsbezeichnung|fahrzeugmodell(?:e)?|eg[-\s]?be[-\s]?nr\.?|typgenehmigung|radlast|abrollumfang)\s*[:.]?\s*/i,
      "",
    )
    .trim();
}

/** True when entry looks like "BMW 320i" / "Mazda RX-8 Spirit R". */
export function looksLikeMakeModel(value: string): boolean {
  const trimmed = stripFieldLabel(value);
  if (trimmed.length < 3 || trimmed.length > 80) return false;
  if (BOILERPLATE_APPROVAL.test(trimmed)) return false;
  if (isTechSpec(trimmed)) return false;
  if (!MAKE_PATTERN.test(trimmed)) return false;
  const withoutMake = trimmed
    .replace(MAKE_PATTERN, "")
    .replace(/^[,\-–/:]+/, "")
    .trim();
  if (withoutMake.length < 1) return false;
  // Reject bare type codes like "SE3P" alone after make — need readable model.
  if (/^[A-Z0-9]{2,6}$/.test(withoutMake) && !MODEL_HINT.test(withoutMake)) {
    return false;
  }
  return trimmed.split(/\s+/).length >= 2;
}

/**
 * Keep only Fahrzeughersteller + Modell Freigaben.
 * Drops technical data, EG-BE numbers, wheel specs, bare makes.
 */
export function normalizeVehicleApprovals(
  values: string[] | null | undefined,
): string[] | null {
  if (!values?.length) return null;

  const cleaned = values
    .map((value) => stripFieldLabel(String(value)).replace(/\.$/, ""))
    .filter((value) => looksLikeMakeModel(value))
    .map((value) => {
      const makeMatch = value.match(MAKE_PATTERN);
      if (!makeMatch?.[1]) return value.slice(0, 160);
      const make = canonicalMake(makeMatch[1]);
      const rest = value
        .replace(MAKE_PATTERN, "")
        .replace(/^[,\-–/:]+/, "")
        .trim();
      return `${make} ${rest}`.replace(/\s+/g, " ").trim().slice(0, 160);
    });

  if (cleaned.length === 0) return null;

  const unique = [...new Set(cleaned)].slice(0, 40);
  return unique.length > 0 ? unique : null;
}

/** Reject LLM prose / authority names mistaken for a KBA number. */
export function isPlausibleKbaNumber(
  value: string | null | undefined,
): boolean {
  if (!value) return false;
  const trimmed = clean(value);
  if (trimmed.length < 3 || trimmed.length > 80) return false;
  if (!/\d{3,}/.test(trimmed)) return false;
  if (trimmed.split(/\s+/).length > 6) return false;
  if (
    /kraftfahrt|bundesamt|hersteller|betriebserlaubnis|teilegutachten|siehe\s|auflage|verwendungsbereich/i.test(
      trimmed,
    ) &&
    !/\d{5}/.test(trimmed)
  ) {
    return false;
  }
  return (
    /(?:kba|abe)/i.test(trimmed) ||
    /^\d{5}$/.test(trimmed) ||
    /^e\s*\d/i.test(trimmed) ||
    /\d{4,}/.test(trimmed)
  );
}

export function looksLikeAbeDocument(rawText: string): boolean {
  if (!rawText.trim()) return false;
  if (ABE_DOCUMENT_HINT.test(rawText)) return true;
  return Boolean(extractKbaNumber(rawText));
}

export function extractKbaNumber(rawText: string): string | null {
  for (const pattern of KBA_PATTERNS) {
    const match = rawText.match(pattern);
    const value = match?.[1] ? clean(match[1]) : null;
    if (!value) continue;
    if (/^(seite|page|datum|tel|nr)$/i.test(value)) continue;
    if (!isPlausibleKbaNumber(value)) continue;
    return normalizeKbaNumber(value);
  }

  // OCR often splits label / number across lines: "KBA" then "91234"
  const lines = rawText.split(/\n+/).map(clean).filter(Boolean);
  for (let index = 0; index < lines.length - 1; index += 1) {
    const line = lines[index];
    if (
      !/^(?:K\.?\s*B\.?\s*A\.?\.?|KBA(?:\s*(?:Nr\.?|Nummer))?)\s*:?$/i.test(line)
    ) {
      continue;
    }
    const digits = lines[index + 1].match(/^(\d{5})\b/);
    if (digits?.[1]) {
      return normalizeKbaNumber(digits[1]);
    }
  }

  return null;
}

function splitModelList(raw: string): string[] {
  return raw
    .split(/[,;/·•]|(?:\s+und\s+)/i)
    .map((part) => clean(part).replace(/^\(|\)$/g, "").trim())
    .filter((part) => part.length >= 1 && part.length <= 80)
    .filter((part) => !isTechSpec(part))
    .filter((part) => !/^e\s*\d+/i.test(part));
}

/**
 * Extract Freigaben as "Hersteller Modell" from Verwendungsbereich tables
 * and plain make+model lines. Never returns wheel/type-approval tech data.
 */
export function extractVehicleApprovals(rawText: string): string[] | null {
  const found = new Set<string>();
  const lines = rawText.split(/\n+/).map(clean).filter(Boolean);

  let currentMake: string | null = null;
  let inFitment = false;

  for (const line of lines) {
    if (
      /verwendungsbereich|fahrzeugliste|typliste|freigabe(?:n)?|geeignet\s+für|genehmigt\s+für/i.test(
        line,
      )
    ) {
      inFitment = true;
    }
    if (
      inFitment &&
      /^(auflage|auflagen|nebenbestimmung|hinweis|technische\s+daten|seite\s*\d)/i.test(
        line,
      )
    ) {
      inFitment = false;
    }

    const makeField = line.match(MAKE_LABEL);
    if (makeField?.[1] && !isTechSpec(makeField[1])) {
      currentMake = canonicalMake(makeField[1]);
      continue;
    }

    const modelField = line.match(MODEL_LABEL);
    if (modelField?.[1]) {
      const make =
        currentMake ??
        (MAKE_PATTERN.test(modelField[1])
          ? canonicalMake(modelField[1].match(MAKE_PATTERN)?.[1] ?? "")
          : null);
      for (const model of splitModelList(modelField[1])) {
        if (MAKE_PATTERN.test(model)) {
          if (looksLikeMakeModel(model)) found.add(model);
          continue;
        }
        if (make && model.length >= 1) {
          found.add(`${make} ${model}`);
        }
      }
      continue;
    }

    // Plain "BMW 320i" / "Audi A4 (B8)" lines (often inside Freigaben lists).
    if (line.length <= 80 && looksLikeMakeModel(line)) {
      found.add(line);
      continue;
    }

    // "Mazda: RX-8, RX-8 Spirit R"
    const makeColon = line.match(MAKE_PATTERN);
    if (
      makeColon?.[1] &&
      /^[A-Za-zÄÖÜäöüß. -]+\s*[:–-]\s*.+/i.test(line) &&
      line.toLowerCase().startsWith(makeColon[1].toLowerCase())
    ) {
      const rest = line
        .slice(makeColon[0].length)
        .replace(/^\s*[:–-]\s*/, "")
        .trim();
      if (rest) {
        const make = canonicalMake(makeColon[1]);
        for (const model of splitModelList(rest)) {
          if (!MAKE_PATTERN.test(model)) found.add(`${make} ${model}`);
          else if (looksLikeMakeModel(model)) found.add(model);
        }
      }
    }
  }

  // Fallback: any make+model phrase in the document if table parse was empty.
  if (found.size === 0) {
    for (const line of lines.slice(0, 80)) {
      if (line.length > 80 || isTechSpec(line)) continue;
      if (looksLikeMakeModel(line)) {
        found.add(line);
        if (found.size >= 20) break;
      }
    }
  }

  return normalizeVehicleApprovals([...found]);
}

const CONDITIONS_HEADER =
  /^(?:(?:[IVXLC]+|\d+)[\).:]?\s*)?(?:auflage(?:n)?|nebenbestimmung(?:en)?|hinweis(?:e)?)\b\s*[:.]?\s*(.*)$/i;

const CONDITIONS_SECTION_END =
  /^(verwendungsbereich|fahrzeugliste|typliste|technische\s+daten|gegenstand|handelsbezeichnung|unterschrift|stempel|anlage\b|seite\s*\d)/i;

/** Matches 1. / 1) / 4.1 / 4.1. / a) / IV. leading markers. */
const NUMBERED_CONDITION =
  /^(?:auflage\s*)?(?:\d+(?:\.\d+)+|\d+|[a-z]|[ivxlc]+)[\).:]?\s+(.+)$/i;

const BULLET_CONDITION = /^[•●▪◦\-–—*]\s+(.+)$/;

function pushCondition(target: string[], value: string): void {
  let text = clean(value);
  text = text.replace(NUMBERED_CONDITION, "$1").trim();
  if (text.length < 12) return;
  if (CONDITIONS_HEADER.test(text) && text.length < 40) return;
  if (/^(verwendungsbereich|fahrzeughersteller)\b/i.test(text)) return;
  // Deduplicate exact repeats from overlapping strategies.
  if (target.some((entry) => entry === text)) return;
  target.push(text.slice(0, 1200));
}

function appendContinuation(target: string[], line: string): void {
  if (target.length === 0) return;
  const text = clean(line);
  if (text.length < 8) return;
  target[target.length - 1] = `${target[target.length - 1]} ${text}`.slice(
    0,
    1200,
  );
}

/**
 * Best-effort Auflagen from OCR text when the LLM omits them.
 * Supports: "Auflagen", "III. Auflagen", "Nebenbestimmungen", "4.1 …", bullets,
 * and prose paragraphs directly under the header.
 */
export function extractConditionsFromText(rawText: string): string[] | null {
  const found: string[] = [];
  // Preserve structure; also split glued OCR on numbered markers.
  const normalized = rawText
    .replace(/\r\n/g, "\n")
    .replace(
      /(?<!\n)\s+(?=(?:auflage\s*)?(?:\d+(?:\.\d+)?|[IVXLC]+)[\).:]\s+\S)/gi,
      "\n",
    );
  const lines = normalized.split(/\n+/).map(clean).filter(Boolean);

  let inBlock = false;
  for (const line of lines) {
    const header = line.match(CONDITIONS_HEADER);
    if (header) {
      inBlock = true;
      const rest = clean(header[1] ?? "");
      // "Auflagen und Hinweise" is still a header — only keep real sentence rest.
      if (
        rest.length >= 20 &&
        !/^(und\s+hinweise|zur\s+betriebserlaubnis)\b/i.test(rest)
      ) {
        pushCondition(found, rest);
      }
      continue;
    }

    if (!inBlock) continue;
    if (CONDITIONS_SECTION_END.test(line)) {
      inBlock = false;
      continue;
    }

    const numbered = line.match(NUMBERED_CONDITION);
    if (numbered?.[1]) {
      pushCondition(found, numbered[1]);
      continue;
    }

    const bullet = line.match(BULLET_CONDITION);
    if (bullet?.[1]) {
      pushCondition(found, bullet[1]);
      continue;
    }

    // "Auflage 1:" on its own line, body follows.
    const auflageLabel = line.match(/^auflage\s*(\d+)\s*[:.]?\s*(.*)$/i);
    if (auflageLabel) {
      const rest = clean(auflageLabel[2] ?? "");
      if (rest.length >= 12) pushCondition(found, rest);
      continue;
    }

    // Prose under Auflagen header (common when OCR drops numbering).
    if (line.length >= 40) {
      if (found.length === 0 || /[.!?]$/.test(found[found.length - 1] ?? "")) {
        pushCondition(found, line);
      } else {
        appendContinuation(found, line);
      }
      continue;
    }

    if (line.length >= 12) {
      appendContinuation(found, line);
    }

    if (found.length >= 40) break;
  }

  // Fallback: scan whole text for "Auflage n …" fragments without a clean block.
  if (found.length === 0) {
    for (const match of rawText.matchAll(
      /(?:^|\n)\s*(?:auflage\s*)?(?:\d+(?:\.\d+)?)[\).:]\s+([A-ZÄÖÜa-zäöü][^\n]{20,400})/gi,
    )) {
      pushCondition(found, match[1] ?? "");
      if (found.length >= 40) break;
    }
  }

  return found.length > 0 ? found.slice(0, 40) : null;
}

export function resolveAbeFields(input: {
  structuredKba: string | null;
  structuredApprovals: string[] | null;
  structuredConditions?: string[] | null;
  rawText: string;
}): {
  kbaNumber: string | null;
  vehicleApprovals: string[] | null;
  conditions: string[] | null;
} {
  // LLM placeholders / authority prose must not block the OCR heuristic.
  const structuredKba = isPlausibleKbaNumber(input.structuredKba)
    ? normalizeKbaNumber(input.structuredKba)
    : null;
  const kbaNumber = structuredKba || extractKbaNumber(input.rawText);

  // LLM often returns tech rows — keep only make+model; fill from OCR if empty.
  const structuredApprovals = normalizeVehicleApprovals(
    input.structuredApprovals,
  );
  const heuristicApprovals = extractVehicleApprovals(input.rawText);
  const vehicleApprovals =
    structuredApprovals && structuredApprovals.length > 0
      ? structuredApprovals
      : heuristicApprovals;

  const structuredConditions =
    input.structuredConditions
      ?.map((value) => clean(value))
      .filter((value) => value.length >= 12)
      .filter((value) => !isTechSpec(value))
      .filter(
        (value) =>
          !/^(verwendungsbereich|fahrzeughersteller|handelsbezeichnung)\b/i.test(
            value,
          ),
      )
      .map((value) => value.slice(0, 1200))
      .slice(0, 40) ?? null;

  const heuristicConditions = extractConditionsFromText(input.rawText);
  const conditions =
    structuredConditions && structuredConditions.length > 0
      ? structuredConditions
      : heuristicConditions;

  return {
    kbaNumber: kbaNumber || null,
    vehicleApprovals,
    conditions,
  };
}
