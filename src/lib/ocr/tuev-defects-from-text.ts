import type { TuevDefectRow } from "@/lib/validations/documentSchemas";

/**
 * HU/AU Prüfpunkt core — always dot-separated (e.g. 4.2.1, 1.3.2a, 4.7.1b, DF6.2.6).
 * Two or more numeric segments joined by dots; optional letter suffix.
 */
export const TUEV_CHECKPOINT_CORE = /(?:DF|D)?\d+(?:\.\d+)+[a-zA-Z]?/;

/** Prüfpunkt with optional leading * or wrapping ( ) / [ ]. */
export const TUEV_CHECKPOINT_PATTERN = new RegExp(
  `\\*?(?:\\(|\\[)?${TUEV_CHECKPOINT_CORE.source}(?:\\)|\\])?`,
);

const CHECKPOINT_LINE_START = new RegExp(
  `^-?\\s*\\[?(\\*?(?:\\(|\\[)?${TUEV_CHECKPOINT_CORE.source}(?:\\)|\\])?)\\]?\\s*(?:\\((EM|GM)\\)\\s*)?(?:[–-]\\s*(?:EM|GM)\\s*[–-]\\s*)?:?\\s*`,
  "i",
);

/** DEKRA: `-D5.2.3c (EM)` on its own line — description follows on next line(s). */
const DEKRA_CHECKPOINT_ONLY = new RegExp(
  `^-?\\s*[\\(\\[]?(\\*?(?:DF|D)?\\d+(?:\\.\\d+)+[a-zA-Z]?)[\\)\\]]?\\s*\\((EM|GM)\\)\\s*$`,
  "i",
);

/** DEKRA: `-5.2.3d (EM) Reifen …` checkpoint + severity + description on one line. */
const DEKRA_CHECKPOINT_INLINE = new RegExp(
  `^-?\\s*[\\(\\[]?(\\*?(?:DF|D)?\\d+(?:\\.\\d+)+[a-zA-Z]?)[\\)\\]]?\\s*\\((EM|GM)\\)\\s+(.+)$`,
  "i",
);

/** TÜV Rheinland single-line: `1.1.13a – EM – Bremsbelag …` */
const RHEINLAND_DASH_ROW = new RegExp(
  `^(\\*?(?:DF|D)?\\d+(?:\\.\\d+)+[a-zA-Z]?)\\s*[–-]\\s*(EM|GM)\\s*[–-]\\s*(.+)$`,
  "i",
);

const CHECKPOINT_GLOBAL = new RegExp(
  `\\*?(?:\\(|\\[)?${TUEV_CHECKPOINT_CORE.source}(?:\\)|\\])?`,
  "g",
);

/**
 * Punkt 6 / Abschnitt 6 headers for Festgestellte Mängel on HU/AU reports.
 * Mängel are always listed under section 6 — never bare "Mängel" (matches legal boilerplate).
 */
const DEFECTS_SECTION_HEADER =
  /(?:\(?6\)?[\.)]?\s*)?(?:Ihr Fahrzeug(?:[\s|]+)*weist folgende Mängel auf|Festgestellte\s+Mängel|Mängelliste|6\.\s*Festgestellte\s+Mängel)\s*:?/gi;

/** Stop parsing before footers, UMA blocks, greetings, or result lines. */
const DEFECTS_SECTION_END =
  /\n\s*(?:Hinweise|Ergebnis|Unterschrift|Seite\s+\d|n[aäe]{0,2}chste\s+(?:hu|untersuchung|hauptuntersuchung)|HU\s+fällig|prüfplakette\s+erteilt|ohne\s+(?:erhebliche\s+)?mängel|Bitte beachten Sie|Lassen Sie bitte|Die Nachprüfung|Bitte legen Sie|Wir bedanken uns|begrüßen zu dürfen|Im Auftrag der|Untersuchung des Motormanagement|Motormanagement\/Abgasreinigung|\(UMA\)|Sehr geehrte|wir haben Ihr Fahrzeug|verantwortlich sind|Ingenieurbüro|Dipl\.?\s*-?\s*Ing|Tel\s*:|(?:Dechant|Straße|Strasse)\b)/i;

const SKIP_DEFECT_LINE =
  /^(?:\(?6\)?[\.)]?\s+)?(?:Ihr Fahrzeug(?:[\s|]+)*weist folgende Mängel auf|Festgestellte\s+Mängel|Mängelliste)\s*:?\s*$/i;

/** Lines that must never become defect rows (legal text, addresses, OCR noise). */
const BOILERPLATE_DEFECT_LINE =
  /(?:Bitte beachten Sie|§\s*\d+\s*StV|verantwortlich sind|Lassen Sie bitte|festgestellten Mängel|Nachprüfung der Beseitigung|Bitte legen Sie|Wir bedanken uns|begrüßen zu dürfen|Im Auftrag der|GTÜ mbH|Ingenieurbüro|Dipl\.?\s*-?\s*Ing|Tel\s*:|Untersuchung des Motormanagement|Motormanagement\/Abgasreinigung|\(UMA\)|Sehr geehrte|wir haben Ihr Fahrzeug|Kontrollnummer\s*:|^\d{6,}\s*$|^\|\s*\|)/i;

export function normalizeCheckpoint(value: string): string {
  return value
    .replace(/^\*/, "")
    .replace(/^[\(\[]+/, "")
    .replace(/[\)\]]+$/, "")
    .trim();
}

function extractSeverity(
  text: string,
): { body: string; severity: "EM" | "GM" | null } {
  const match = text.match(/^(.*?)\s*\((EM|GM)\)\s*$/);
  if (!match) return { body: text.trim(), severity: null };
  return {
    body: match[1]!.trim(),
    severity: match[2] as "EM" | "GM",
  };
}

/**
 * Parse a single Mängel line (defectsList entry or description with embedded Prüfpunkt).
 * Handles dot-separated Prüfpunkte at line start, bracket form `[4.2.1]`, and (EM)/(GM).
 */
export function parseTuevDefectLine(text: string): TuevDefectRow | null {
  const trimmed = text.trim();
  if (!trimmed || isBoilerplateLine(trimmed)) return null;

  const rheinland = trimmed.match(RHEINLAND_DASH_ROW);
  if (rheinland) {
    const description = rheinland[3]!.trim();
    if (description.length < 3) return null;
    return {
      checkpoint: normalizeCheckpoint(rheinland[1]!),
      description: description.slice(0, 500),
      severity: rheinland[2]!.toUpperCase() as "EM" | "GM",
    };
  }

  const { body, severity } = extractSeverity(trimmed);
  const bracketMatch = body.match(
    /^\[(\*?(?:\(?)(?:DF|D)?\d+(?:\.\d+)+[a-zA-Z]?(?:\)?))\]\s*(.*)$/,
  );
  if (bracketMatch) {
    const description = bracketMatch[2]!.trim();
    if (!description || description.length < 3) return null;
    return {
      checkpoint: normalizeCheckpoint(bracketMatch[1]!),
      description: description.slice(0, 500),
      severity,
    };
  }

  const lineMatch = body.match(CHECKPOINT_LINE_START);
  if (lineMatch) {
    const description = body.slice(lineMatch[0].length).trim();
    if (!description || description.length < 3) return null;
    const inlineSeverity = lineMatch[2]?.toUpperCase();
    return {
      checkpoint: normalizeCheckpoint(lineMatch[1]!),
      description: description.slice(0, 500),
      severity:
        inlineSeverity === "EM" || inlineSeverity === "GM"
          ? inlineSeverity
          : severity,
    };
  }

  if (severity) {
    return parsePlainDefectLine(body, severity);
  }

  return null;
}

function normalizeDefectLine(rawLine: string): string {
  return rawLine.trim().replace(/^[:|]+\s*/, "");
}

function normalizeSectionBody(section: string): string {
  return section.replace(/^[\s:|]+/, "").trim();
}

function isBoilerplateLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed === "—" || trimmed === "|") return true;
  if (SKIP_DEFECT_LINE.test(trimmed)) return true;
  return BOILERPLATE_DEFECT_LINE.test(trimmed);
}

/** Description-only Mängel row — requires EM/GM to avoid legal-text false positives. */
function parsePlainDefectLine(
  text: string,
  severity: "EM" | "GM" | null,
): TuevDefectRow | null {
  if (!severity) return null;

  const trimmed = text.trim();
  if (!trimmed || isBoilerplateLine(trimmed)) return null;
  if (TUEV_CHECKPOINT_PATTERN.test(trimmed)) return null;

  const description = trimmed.replace(/\s*\((EM|GM)\)\s*$/, "").trim();
  if (description.length < 6 || isBoilerplateLine(description)) return null;

  return {
    checkpoint: null,
    description: description.slice(0, 500),
    severity,
  };
}

function parseCheckpointChunk(text: string): TuevDefectRow | null {
  const trimmed = text.trim();
  if (!trimmed || isBoilerplateLine(trimmed)) return null;

  const rheinland = trimmed.match(RHEINLAND_DASH_ROW);
  if (rheinland) {
    return {
      checkpoint: normalizeCheckpoint(rheinland[1]!),
      description: rheinland[3]!.trim().slice(0, 500),
      severity: rheinland[2]!.toUpperCase() as "EM" | "GM",
    };
  }

  const match = trimmed.match(
    /^[\(\[]?(\*?(?:DF|D)?\d+(?:\.\d+)+[a-zA-Z]?)[\)\]]?\s*:?\s*([\s\S]*)$/,
  );
  if (!match) return null;

  const description = (match[2]?.trim() ?? "")
    .replace(/^[\)\]:]+\s*/, "")
    .replace(/\s*\((EM|GM)\)\s*$/, "")
    .trim();
  if (!description || description.length < 3) return null;
  if (isBoilerplateLine(description)) return null;

  return {
    checkpoint: normalizeCheckpoint(match[1]!),
    description: description.slice(0, 500),
    severity: null,
  };
}

function splitChunkByCheckpoints(chunk: string): string[] {
  const matches = [...chunk.matchAll(CHECKPOINT_GLOBAL)];
  if (matches.length === 0) return [];

  const parts: string[] = [];
  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index]!.index ?? 0;
    const end =
      index + 1 < matches.length
        ? (matches[index + 1]!.index ?? chunk.length)
        : chunk.length;
    const slice = chunk.slice(start, end).trim();
    if (slice) parts.push(slice);
  }

  return parts;
}

function parseInlineDefects(body: string): TuevDefectRow[] {
  const defects: TuevDefectRow[] = [];
  const parts = body.split(/\((EM|GM)\)/);

  for (let index = 0; index < parts.length; index += 2) {
    const chunk = parts[index]?.trim();
    if (!chunk || isBoilerplateLine(chunk)) continue;

    const severityRaw = parts[index + 1];
    const severity =
      severityRaw === "EM" || severityRaw === "GM" ? severityRaw : null;
    const subChunks = splitChunkByCheckpoints(chunk);

    if (subChunks.length === 0) {
      const plain = parsePlainDefectLine(chunk, severity);
      if (plain) defects.push(plain);
      continue;
    }

    subChunks.forEach((subChunk, subIndex) => {
      const row = parseCheckpointChunk(subChunk);
      if (!row?.checkpoint) return;
      defects.push({
        ...row,
        severity:
          subIndex === subChunks.length - 1 ? severity : row.severity ?? null,
      });
    });
  }

  return defects;
}

function parseMultilineDefects(body: string): TuevDefectRow[] {
  const defects: TuevDefectRow[] = [];
  let pendingCheckpoint: string | null = null;
  let pendingSeverity: "EM" | "GM" | null = null;
  let pendingDescriptionLines: string[] = [];

  function flushPendingDefect() {
    if (!pendingCheckpoint || !pendingSeverity) {
      pendingCheckpoint = null;
      pendingSeverity = null;
      pendingDescriptionLines = [];
      return;
    }

    const description = pendingDescriptionLines.join(" ").replace(/\s+/g, " ").trim();
    if (description.length >= 3 && !isBoilerplateLine(description)) {
      defects.push({
        checkpoint: pendingCheckpoint,
        description: description.slice(0, 500),
        severity: pendingSeverity,
      });
    }

    pendingCheckpoint = null;
    pendingSeverity = null;
    pendingDescriptionLines = [];
  }

  for (const rawLine of body.split(/\n/)) {
    const line = normalizeDefectLine(rawLine);
    if (!line || isBoilerplateLine(line)) {
      flushPendingDefect();
      continue;
    }

    const dekraInline = line.match(DEKRA_CHECKPOINT_INLINE);
    if (dekraInline) {
      flushPendingDefect();
      defects.push({
        checkpoint: normalizeCheckpoint(dekraInline[1]!),
        description: dekraInline[3]!.trim().slice(0, 500),
        severity: dekraInline[2]!.toUpperCase() as "EM" | "GM",
      });
      continue;
    }

    const dekraOnly = line.match(DEKRA_CHECKPOINT_ONLY);
    if (dekraOnly) {
      flushPendingDefect();
      pendingCheckpoint = normalizeCheckpoint(dekraOnly[1]!);
      pendingSeverity = dekraOnly[2]!.toUpperCase() as "EM" | "GM";
      continue;
    }

    if (pendingCheckpoint && pendingSeverity) {
      pendingDescriptionLines.push(line);
      continue;
    }

    if (pendingCheckpoint) {
      const combined = [`*${pendingCheckpoint}`, ...pendingDescriptionLines, line]
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const row = parseCheckpointChunk(combined);
      if (row?.checkpoint) {
        defects.push(row);
        flushPendingDefect();
      } else {
        pendingDescriptionLines.push(line);
      }
      continue;
    }

    if (TUEV_CHECKPOINT_PATTERN.test(line) && !/\([EG]M\)/.test(line)) {
      const onlyCheckpoint = line.match(
        /^-?[\(\[]?(\*?(?:DF|D)?\d+(?:\.\d+)+[a-zA-Z]?)[\)\]]?\s*$/,
      );
      if (onlyCheckpoint) {
        flushPendingDefect();
        pendingCheckpoint = normalizeCheckpoint(onlyCheckpoint[1]!);
        continue;
      }
    }

    if (/\([EG]M\)/.test(line)) {
      flushPendingDefect();

      const rheinland = line.match(RHEINLAND_DASH_ROW);
      if (rheinland) {
        defects.push({
          checkpoint: normalizeCheckpoint(rheinland[1]!),
          description: rheinland[3]!.trim().slice(0, 500),
          severity: rheinland[2]!.toUpperCase() as "EM" | "GM",
        });
        continue;
      }

      defects.push(...parseInlineDefects(line));
      continue;
    }

    const parsedLine = parseTuevDefectLine(line);
    if (parsedLine) {
      flushPendingDefect();
      defects.push(parsedLine);
      continue;
    }

    const row = parseCheckpointChunk(line);
    if (row?.checkpoint) {
      flushPendingDefect();
      defects.push(row);
    }
  }

  flushPendingDefect();
  return defects;
}

function dedupeDefects(rows: TuevDefectRow[]): TuevDefectRow[] {
  const seen = new Set<string>();
  const unique: TuevDefectRow[] = [];

  for (const row of rows) {
    const key = [
      row.checkpoint ?? "",
      row.description.toLowerCase(),
      row.severity ?? "",
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
    if (unique.length >= 80) break;
  }

  return unique;
}

/** Use the last explicit Mängel header (footer/legal text often precedes the real list). */
function sliceDefectsSection(text: string): string | null {
  let lastIndex: number | null = null;
  let lastLength = 0;

  for (const match of text.matchAll(DEFECTS_SECTION_HEADER)) {
    if (match.index != null) {
      lastIndex = match.index;
      lastLength = match[0].length;
    }
  }

  if (lastIndex == null) return null;

  const tail = text.slice(lastIndex + lastLength);
  const endMatch = tail.search(DEFECTS_SECTION_END);
  const section = (
    endMatch >= 0 ? tail.slice(0, endMatch) : tail.slice(0, 8_000)
  )
    .replace(/^\(\d+\)\s*/i, "")
    .trim();

  return section.length >= 4 ? section : null;
}

/** Extract HU/AU Mängel under an explicit Mängel section (Prüfpunkt and/or EM/GM lines). */
export function extractTuevDefectsFromText(
  rawText: string,
): TuevDefectRow[] | null {
  const text = rawText.replace(/\r\n/g, "\n");
  const section = sliceDefectsSection(text);
  if (!section) return null;

  const normalizedSection = normalizeSectionBody(section);

  const lines = normalizedSection
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const multiline = parseMultilineDefects(normalizedSection);
  const perLine = lines
    .map((line) => parseTuevDefectLine(line))
    .filter((row): row is TuevDefectRow => row != null);
  const inline =
    lines.length <= 1
      ? parseInlineDefects(normalizedSection.replace(/\n+/g, " "))
      : [];

  const deduped = dedupeDefects([...multiline, ...perLine, ...inline]);
  return deduped.length > 0 ? deduped : null;
}

export function defectsListFromTuevDefectRows(
  rows: TuevDefectRow[] | null | undefined,
): string[] | null {
  if (!rows?.length) return null;

  return rows.map((row) => {
    const parts = [
      row.checkpoint ? `[${row.checkpoint}]` : null,
      row.description,
      row.severity ? `(${row.severity})` : null,
    ].filter(Boolean);
    return parts.join(" ").slice(0, 500);
  });
}
