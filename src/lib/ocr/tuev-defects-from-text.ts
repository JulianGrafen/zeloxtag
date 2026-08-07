import type { TuevDefectRow } from "@/lib/validations/documentSchemas";

/** HU/AU Prüfpunkt (e.g. 4.7.1b, DF6.2.6, D7.1.1a). */
export const TUEV_CHECKPOINT_PATTERN = /\*?(?:DF|D)?\d+(?:\.\d+)+[a-zA-Z]?/;

const CHECKPOINT_GLOBAL = /\*?(?:DF|D)?\d+(?:\.\d+)+[a-zA-Z]?/g;

/**
 * Explicit Mängel list headers only — never bare "Mängel" (matches legal boilerplate).
 */
const DEFECTS_SECTION_HEADER =
  /(?:\(\d+\)\s*)?(?:Ihr Fahrzeug(?:[\s|]+)*weist folgende Mängel auf|Festgestellte\s+Mängel\s*:|Mängelliste\s*:)/gi;

/** Stop parsing before footers, UMA blocks, greetings, or result lines. */
const DEFECTS_SECTION_END =
  /\n\s*(?:Hinweise|Ergebnis|Unterschrift|Seite\s+\d|n[aäe]{0,2}chste\s+(?:hu|untersuchung|hauptuntersuchung)|HU\s+fällig|prüfplakette\s+erteilt|ohne\s+(?:erhebliche\s+)?mängel|Bitte beachten Sie|Lassen Sie bitte|Die Nachprüfung|Bitte legen Sie|Wir bedanken uns|begrüßen zu dürfen|Im Auftrag der|Untersuchung des Motormanagement|Motormanagement\/Abgasreinigung|\(UMA\)|Sehr geehrte|wir haben Ihr Fahrzeug|verantwortlich sind|Ingenieurbüro|Dipl\.?\s*-?\s*Ing|Tel\s*:|(?:Dechant|Straße|Strasse)\b)/i;

const SKIP_DEFECT_LINE =
  /^(?:\(\d+\)\s*)?(?:Ihr Fahrzeug(?:[\s|]+)*weist folgende Mängel auf|Festgestellte\s+Mängel\s*:?|Mängelliste\s*:?)\s*$/i;

/** Lines that must never become defect rows (legal text, addresses, OCR noise). */
const BOILERPLATE_DEFECT_LINE =
  /(?:Bitte beachten Sie|§\s*\d+\s*StV|verantwortlich sind|Lassen Sie bitte|festgestellten Mängel|Nachprüfung der Beseitigung|Bitte legen Sie|Wir bedanken uns|begrüßen zu dürfen|Im Auftrag der|GTÜ mbH|Ingenieurbüro|Dipl\.?\s*-?\s*Ing|Tel\s*:|Untersuchung des Motormanagement|Motormanagement\/Abgasreinigung|\(UMA\)|Sehr geehrte|wir haben Ihr Fahrzeug|Kontrollnummer\s*:|^\d{6,}\s*$|^\|\s*\|)/i;

function normalizeCheckpoint(value: string): string {
  return value.replace(/^\*/, "").trim();
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

  const match = trimmed.match(
    /^(\*?(?:DF|D)?\d+(?:\.\d+)+[a-zA-Z]?)\s*([\s\S]*)$/,
  );
  if (!match) return null;

  const description = (match[2]?.trim() ?? "")
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

  for (const rawLine of body.split(/\n/)) {
    const line = normalizeDefectLine(rawLine);
    if (!line || isBoilerplateLine(line)) {
      pendingCheckpoint = null;
      continue;
    }

    if (TUEV_CHECKPOINT_PATTERN.test(line) && !/\([EG]M\)/.test(line)) {
      const onlyCheckpoint = line.match(
        /^(\*?(?:DF|D)?\d+(?:\.\d+)+[a-zA-Z]?)\s*$/,
      );
      if (onlyCheckpoint) {
        pendingCheckpoint = normalizeCheckpoint(onlyCheckpoint[1]!);
        continue;
      }
    }

    if (/\([EG]M\)/.test(line)) {
      defects.push(...parseInlineDefects(line));
      pendingCheckpoint = null;
      continue;
    }

    if (pendingCheckpoint) {
      const row = parseCheckpointChunk(`${pendingCheckpoint} ${line}`);
      if (row?.checkpoint) defects.push(row);
      pendingCheckpoint = null;
      continue;
    }

    const row = parseCheckpointChunk(line);
    if (row?.checkpoint) defects.push(row);
  }

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

  const lineCount = normalizedSection
    .split(/\n/)
    .filter((line) => line.trim()).length;
  const parsed =
    lineCount >= 4
      ? parseMultilineDefects(normalizedSection)
      : parseInlineDefects(normalizedSection.replace(/\n+/g, " "));

  const merged =
    lineCount >= 4 && parsed.length < 2
      ? parseInlineDefects(normalizedSection.replace(/\n+/g, " "))
      : parsed;

  const deduped = dedupeDefects(merged);
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
