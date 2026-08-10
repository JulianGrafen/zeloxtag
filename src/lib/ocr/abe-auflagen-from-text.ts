import { looksLikeAuflagenCode } from "@/lib/ocr/abe-wizard-vehicle-normalize";

export type AbeAuflageEntry = {
  code: string;
  text: string;
};

const CODE_PREFIX =
  /^(?:auflage(?:n)?|bedingung|hinweis)\s*[:\-]?\s*/i;

const CODE_LINE =
  /^([A-Z0-9]{2,6})\s*(?:[:\-–—\.]|)\s*(.*)$/i;

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export type ParseAbeAuflagenNotesOptions = {
  /** When true and knownCodes is non-empty, ignore regex-only code matches. */
  strict?: boolean;
};

function isAuflagenCodeToken(
  raw: string,
  knownCodes: Set<string>,
  strict = false,
): boolean {
  const code = normalizeCode(raw);
  if (!code || code.length > 6) return false;
  if (knownCodes.has(code)) return true;
  if (strict && knownCodes.size > 0) return false;
  return looksLikeAuflagenCode(code);
}

function parseCodeLine(
  line: string,
  knownCodes: Set<string>,
  strict = false,
): { code: string; text: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const withoutPrefix = trimmed.replace(CODE_PREFIX, "").trim();

  for (const candidate of [...knownCodes].sort((a, b) => b.length - a.length)) {
    const prefix = new RegExp(
      `^${escapeRegExp(candidate)}\\s*(?:[:\\-–—\\.]|\\s+|$)`,
      "i",
    );
    if (!prefix.test(withoutPrefix)) continue;
    const text = withoutPrefix
      .replace(prefix, "")
      .replace(/^[\-–—.:]\s*/, "")
      .trim();
    return { code: candidate, text };
  }

  const match = CODE_LINE.exec(withoutPrefix);
  if (!match?.[1]) return null;

  const code = normalizeCode(match[1]);
  if (!isAuflagenCodeToken(code, knownCodes, strict)) return null;

  return { code, text: (match[2] ?? "").trim() };
}

function looksLikeRejectedCodeLine(
  line: string,
  knownCodes: Set<string>,
  strict: boolean,
): boolean {
  if (!strict || knownCodes.size === 0) return false;
  const trimmed = line.trim();
  if (!trimmed) return false;

  const withoutPrefix = trimmed.replace(CODE_PREFIX, "").trim();
  const match = CODE_LINE.exec(withoutPrefix);
  if (!match?.[1]) return false;

  const code = normalizeCode(match[1]);
  return !knownCodes.has(code) && looksLikeAuflagenCode(code);
}

function flushEntry(
  entries: AbeAuflageEntry[],
  current: AbeAuflageEntry | null,
): AbeAuflageEntry | null {
  if (!current) return null;
  entries.push({
    code: current.code,
    text: current.text.trim(),
  });
  return null;
}

/**
 * Split flat OCR Auflagen prose into per-code sections (744, A02, B04A, …).
 */
export function parseAbeAuflagenNotes(
  raw: string,
  knownCodes: string[] = [],
  options?: ParseAbeAuflagenNotesOptions,
): AbeAuflageEntry[] {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const strict = options?.strict === true;
  const known = new Set(knownCodes.map(normalizeCode));
  const lines = text.split("\n");
  const entries: AbeAuflageEntry[] = [];
  let current: AbeAuflageEntry | null = null;

  for (const line of lines) {
    const parsed = parseCodeLine(line, known, strict);
    if (parsed) {
      current = flushEntry(entries, current);
      current = parsed;
      continue;
    }

    const trimmed = line.trim();
    if (looksLikeRejectedCodeLine(trimmed, known, strict)) {
      current = flushEntry(entries, current);
      continue;
    }
    if (!trimmed) {
      if (current?.text) {
        current.text = `${current.text}\n`;
      }
      continue;
    }

    if (current) {
      current.text = current.text
        ? `${current.text}\n${trimmed}`
        : trimmed;
    }
  }

  flushEntry(entries, current);

  if (entries.length > 0) {
    return entries;
  }

  return splitAbeAuflagenByKnownCodes(text, knownCodes);
}

/** Keep only OCR sections for codes from the selected vehicle row. */
export function sanitizeAuflagenNotesForTargetCodes(
  notes: string | null | undefined,
  targetCodes: readonly string[],
): string | null {
  const trimmed = notes?.trim();
  if (!trimmed) return null;
  if (targetCodes.length === 0) return trimmed;

  const allowed = new Set(targetCodes.map(normalizeCode));
  const entries = parseAbeAuflagenNotes(trimmed, [...targetCodes], {
    strict: true,
  }).filter((entry) => allowed.has(normalizeCode(entry.code)));

  if (entries.length === 0) return null;
  return abeAuflagenEntriesToConditions(entries).join("\n\n");
}

function splitAbeAuflagenByKnownCodes(
  text: string,
  knownCodes: string[],
): AbeAuflageEntry[] {
  const codes = [...new Set(knownCodes.map(normalizeCode).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  if (codes.length === 0) return [];

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const entries: AbeAuflageEntry[] = [];
  let current: AbeAuflageEntry | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current?.text) current.text = `${current.text}\n`;
      continue;
    }

    let matched = false;
    for (const code of codes) {
      const prefix = new RegExp(
        `^${escapeRegExp(code)}\\s*(?:[:\\-–—\\.]|\\s+|$)`,
        "i",
      );
      if (!prefix.test(trimmed)) continue;
      current = flushEntry(entries, current);
      const body = trimmed
        .replace(prefix, "")
        .replace(/^[\-–—.:]\s*/, "")
        .trim();
      current = { code, text: body };
      matched = true;
      break;
    }

    if (!matched && current) {
      current.text = current.text
        ? `${current.text}\n${trimmed}`
        : trimmed;
    }
  }

  flushEntry(entries, current);
  return entries;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** DB `conditions` rows: "744: Montage nur …" */
export function abeAuflagenEntriesToConditions(
  entries: AbeAuflageEntry[],
): string[] {
  return entries.map(({ code, text }) =>
    text ? `${code}: ${text}` : code,
  );
}

export function abeAuflagenConditionsFromNotes(
  notes: string | null | undefined,
  knownCodes: string[] = [],
): string[] {
  const entries = parseAbeAuflagenNotes(notes ?? "", knownCodes);
  if (entries.length === 0) {
    const trimmed = notes?.trim();
    return trimmed ? [trimmed] : [];
  }
  return abeAuflagenEntriesToConditions(entries);
}

export function isAbeCodeStructuredConditions(conditions: string[]): boolean {
  if (conditions.length === 0) return false;
  const known = new Set<string>();
  return conditions.some((row) => {
    const colon = row.indexOf(":");
    if (colon <= 0) return false;
    const code = normalizeCode(row.slice(0, colon).trim());
    if (!isAuflagenCodeToken(code, known)) return false;
    const text = row.slice(colon + 1).trim();
    return text.length > 0;
  });
}

export function abeAuflagenKnownCodesFromConditions(
  conditions: string[],
): string[] {
  return conditions
    .map((row) => {
      const colon = row.indexOf(":");
      const token = colon > 0 ? row.slice(0, colon).trim() : row.trim();
      return normalizeCode(token);
    })
    .filter(Boolean);
}

export function abeAuflagenEntriesFromConditions(
  conditions: string[],
): AbeAuflageEntry[] {
  return conditions.map((row) => {
    const colon = row.indexOf(":");
    if (colon <= 0) {
      return { code: "Auflage", text: row.trim() };
    }
    const code = row.slice(0, colon).trim();
    const text = row.slice(colon + 1).trim();
    return { code, text };
  });
}

function auflagenCodeMentionedInNotes(
  notes: string,
  code: string,
): boolean {
  const normalized = normalizeCode(code);
  if (!normalized) return false;

  const entries = parseAbeAuflagenNotes(notes, [normalized]);
  if (entries.some((entry) => entry.code === normalized && entry.text.trim())) {
    return true;
  }

  const pattern = new RegExp(
    `(?:^|[\\s\\n])${escapeRegExp(normalized)}\\s*(?:[:\\-–—]|\\s|$)`,
    "im",
  );
  return pattern.test(notes);
}

/** Target Kürzel from the vehicle table that still lack text in OCR notes. */
export function missingAuflagenCodesInNotes(
  notes: string | null | undefined,
  targetCodes: string[],
): string[] {
  const trimmedNotes = notes?.trim();
  if (!trimmedNotes) return [...targetCodes];

  const seen = new Set<string>();
  const missing: string[] = [];

  for (const raw of targetCodes) {
    const code = normalizeCode(raw);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    if (!auflagenCodeMentionedInNotes(trimmedNotes, code)) {
      missing.push(code);
    }
  }

  return missing;
}

export function auflagenCodesCoveredInNotes(
  notes: string | null | undefined,
  targetCodes: string[],
): string[] {
  if (targetCodes.length === 0) return [];
  const missing = new Set(
    missingAuflagenCodesInNotes(notes, targetCodes).map(normalizeCode),
  );
  return targetCodes
    .map(normalizeCode)
    .filter((code, index, all) => code && all.indexOf(code) === index)
    .filter((code) => !missing.has(code));
}
