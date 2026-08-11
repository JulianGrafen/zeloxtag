import type { TableData } from "@/lib/validations/abeSchema";

/** Max stored Kennzeichnung text (tables can be long). */
export const ABE_MARKING_TEXT_MAX = 2_000;

const MARKING_HEADING =
  /^(?:Kennzeichnung(?:\s+am\s+Bauteil)?)\s*[:\-]?\s*/i;

const MARKING_SECTION_HEADING =
  /(?:^|\n)\s*(?:Kennzeichnung|Kennzeichnung\s+am\s+Bauteil)\b[^\n]*/i;

const MARKING_SECTION_END =
  /\n\s*(?:Verwendungsbereich|Fahrzeug(?:tabelle|-)?|Verkaufsbezeichnung|Auflagen|Genehmigungszeichen|Anlage\b|Anhang\b)/i;

const ART_INLINE =
  /Art\s+der\s+Kennzeichnung\s*[:\-|]\s*([^\n|]+)/i;

const HERSTELLERZEICHEN_INLINE =
  /(?:^|\n)\s*Herstellerzeichen\s*[:\-|]\s*([^\n|]+)/i;

const HERSTELLERZEICHEN_PIPE = /^herstellerzeichen$/i;

const NUMMER_INLINE =
  /(?:Kennzeichnungs(?:nummer|nr\.?)|Nummer\s+der\s+Kennzeichnung|(?<![A-Za-z0-9])Nummer)\s*[:\-|]\s*([^\n|]+)/i;

/**
 * Light cleanup — preserve line breaks and table rows, do not paraphrase.
 */
export function normalizeAbeMarkingText(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;

  const text = value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, index, lines) => line.length > 0 || lines[index + 1]?.length)
    .join("\n")
    .replace(MARKING_HEADING, "")
    .trim();

  if (text.length < 2) return null;
  return text.slice(0, ABE_MARKING_TEXT_MAX);
}

/**
 * When merging photos, keep the more complete verbatim Kennzeichnung block.
 */
export function mergeAbeMarkingText(
  current: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  const cur = normalizeAbeMarkingText(current);
  const next = normalizeAbeMarkingText(incoming);
  if (!next) return cur;
  if (!cur) return next;
  if (cur === next) return cur;
  if (cur.includes(next)) return cur;
  if (next.includes(cur)) return next;

  const lines = Array.from(
    new Set([...cur.split("\n"), ...next.split("\n")].filter(Boolean)),
  );
  return normalizeAbeMarkingText(lines.join("\n"));
}

function pushLabelValue(
  lines: string[],
  label: string,
  value: unknown,
): void {
  if (typeof value !== "string" || !value.trim()) return;
  lines.push(`${label}: ${value.trim()}`);
}

function pushTableRows(lines: string[], rows: unknown): void {
  if (!Array.isArray(rows)) return;

  for (const row of rows) {
    if (Array.isArray(row) && row.length >= 2) {
      const label = String(row[0] ?? "").trim();
      const value = String(row[1] ?? "").trim();
      if (label && value) lines.push(`${label}: ${value}`);
      continue;
    }

    if (row && typeof row === "object") {
      const record = row as Record<string, unknown>;
      pushLabelValue(lines, "Art der Kennzeichnung", record.label);
      pushLabelValue(lines, "Art der Kennzeichnung", record.artDerKennzeichnung);
      pushLabelValue(
        lines,
        String(record.label ?? record.name ?? "Art der Kennzeichnung"),
        record.value ?? record.text,
      );
    }
  }
}

function parsePipeTableLine(line: string): string | null {
  if (!line.includes("|")) return null;

  const cells = line
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
  if (cells.length < 2) return null;
  if (cells.every((cell) => /^[-–—]+$/.test(cell))) return null;

  const label = cells[0] ?? "";
  const value = cells.slice(1).join(" · ").trim();
  if (!label || !value) return null;
  if (/^art\s+der\s+kennzeichnung$/i.test(label)) {
    return `Art der Kennzeichnung: ${value}`;
  }
  if (HERSTELLERZEICHEN_PIPE.test(label)) {
    return `Herstellerzeichen: ${value}`;
  }
  if (/^(?:nummer|kennzeichnungs(?:nummer|nr\.?))$/i.test(label)) {
    return `Nummer: ${value}`;
  }
  return `${label}: ${value}`;
}

function formatAbeMarkingSection(section: string): string | null {
  const lines: string[] = [];

  for (const rawLine of section.split("\n")) {
    const line = rawLine.replace(/[ \t]+/g, " ").trim();
    if (!line) continue;

    const pipeLine = parsePipeTableLine(line);
    if (pipeLine) {
      lines.push(pipeLine);
      continue;
    }

    if (/^art\s+der\s+kennzeichnung\s*[:\-|]/i.test(line)) {
      lines.push(line);
      continue;
    }
    if (/^(?:nummer|kennzeichnungs(?:nummer|nr\.?)|nummer\s+der\s+kennzeichnung)\s*[:\-|]/i.test(line)) {
      lines.push(line);
      continue;
    }

    if (!/^[\|+\-–—]+$/.test(line)) {
      lines.push(line);
    }
  }

  if (lines.length === 0) return null;
  return normalizeAbeMarkingText(lines.join("\n"));
}

function sliceAbeMarkingSection(rawText: string): string | null {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (text.length < 8) return null;

  const headingMatch = text.match(MARKING_SECTION_HEADING);
  if (headingMatch?.index === undefined) return null;

  const tail = text.slice(headingMatch.index + headingMatch[0].length);
  const endAt = tail.search(MARKING_SECTION_END);
  return (endAt >= 0 ? tail.slice(0, endAt) : tail.slice(0, 1_500)).trim();
}

/** Extract the marking brand from Kennzeichnungen / marking text. */
export function extractHerstellerzeichenFromText(
  rawText: string | null | undefined,
): string | null {
  if (!rawText?.trim()) return null;

  const inline = rawText.match(HERSTELLERZEICHEN_INLINE)?.[1]?.trim();
  if (inline && inline.length >= 2) {
    return inline.replace(/\s{2,}/g, " ").trim();
  }

  for (const rawLine of rawText.split("\n")) {
    const pipeLine = parsePipeTableLine(rawLine.replace(/[ \t]+/g, " ").trim());
    if (pipeLine?.startsWith("Herstellerzeichen:")) {
      const value = pipeLine.slice("Herstellerzeichen:".length).trim();
      if (value.length >= 2) return value;
    }
  }

  return null;
}

/** Parse Kennzeichnung block from OCR / LLM plain text. */
export function extractAbeMarkingFromText(
  rawText: string | null | undefined,
): string | null {
  if (!rawText?.trim()) return null;

  const section = sliceAbeMarkingSection(rawText);
  if (section) {
    const formatted = formatAbeMarkingSection(section);
    if (formatted) return formatted;
  }

  const art = rawText.match(ART_INLINE)?.[1];
  const num = rawText.match(NUMMER_INLINE)?.[1];
  if (art || num) {
    const lines: string[] = [];
    pushLabelValue(lines, "Art der Kennzeichnung", art);
    pushLabelValue(lines, "Nummer", num);
    return normalizeAbeMarkingText(lines.join("\n"));
  }

  return normalizeAbeMarkingText(rawText);
}

/** Read Kennzeichnung rows from structured ABE tables when present. */
export function extractAbeMarkingFromTable(
  table: TableData | null | undefined,
): string | null {
  if (!table?.rows.length) return null;

  const lines: string[] = [];
  for (const row of table.rows) {
    const cells = row.cells.map((cell) => cell.trim()).filter(Boolean);
    if (cells.length < 2) continue;

    const label = cells[0] ?? "";
    const value = cells.slice(1).join(" · ");
    if (/art\s+der\s+kennzeichnung|kennzeichnung\s+am\s+bauteil|^kennzeichnung$/i.test(label)) {
      pushLabelValue(lines, "Art der Kennzeichnung", value);
    } else if (HERSTELLERZEICHEN_PIPE.test(label)) {
      pushLabelValue(lines, "Herstellerzeichen", value);
    } else if (/kennzeichnungs(?:nummer|nr)|nummer\s+der\s+kennzeichnung|^nummer$/i.test(label)) {
      pushLabelValue(lines, "Nummer", value);
    } else if (/kennzeichnung/i.test(label)) {
      pushLabelValue(lines, label, value);
    }
  }

  if (lines.length === 0) return null;
  return normalizeAbeMarkingText(lines.join("\n"));
}

/**
 * Coerce LLM marking payload to verbatim multi-line text (incl. table rows).
 */
export function coerceAbeMarkingText(raw: unknown): string | null {
  if (typeof raw === "string") {
    return mergeAbeMarkingText(
      normalizeAbeMarkingText(raw),
      extractAbeMarkingFromText(raw),
    );
  }
  if (!raw || typeof raw !== "object") return null;

  const record = raw as Record<string, unknown>;
  const lines: string[] = [];

  pushLabelValue(lines, "Art der Kennzeichnung", record.markingType);
  pushLabelValue(lines, "Art der Kennzeichnung", record.artDerKennzeichnung);
  pushLabelValue(lines, "Herstellerzeichen", record.herstellerzeichen);
  pushLabelValue(lines, "Herstellerzeichen", record.manufacturerMark);
  pushLabelValue(lines, "Nummer", record.markingNumber);
  pushLabelValue(lines, "Nummer", record.nummer);
  pushLabelValue(lines, "Nummer der Kennzeichnung", record.kennzeichnungsnummer);
  pushLabelValue(lines, "Kennzeichnung", record.physicalMarking);
  pushLabelValue(lines, "Kennzeichnung", record.kennzeichnung);

  pushTableRows(lines, record.rows);
  pushTableRows(lines, record.table);
  pushTableRows(lines, record.markingRows);
  pushTableRows(lines, record.markingTable);

  const structured = lines.length > 0 ? normalizeAbeMarkingText(lines.join("\n")) : null;
  const fromMarkingText =
    typeof record.markingText === "string"
      ? mergeAbeMarkingText(
          normalizeAbeMarkingText(record.markingText),
          extractAbeMarkingFromText(record.markingText),
        )
      : null;

  return mergeAbeMarkingText(fromMarkingText, structured);
}

/** Merge every Kennzeichnung signal from an LLM record into one verbatim block. */
export function resolveAbeMarkingText(
  input: Record<string, unknown> | null | undefined,
): string | null {
  if (!input) return null;

  const candidates: (string | null | undefined)[] = [
    coerceAbeMarkingText(input),
    typeof input.markingText === "string"
      ? extractAbeMarkingFromText(input.markingText)
      : null,
    typeof input.physicalMarking === "string"
      ? normalizeAbeMarkingText(input.physicalMarking)
      : null,
    typeof input.kennzeichnung === "string"
      ? extractAbeMarkingFromText(input.kennzeichnung)
      : null,
    typeof input.ocrText === "string"
      ? extractAbeMarkingFromText(input.ocrText)
      : null,
  ];

  return candidates.reduce<string | null>(
    (best, next) => mergeAbeMarkingText(best, next),
    null,
  );
}

/** Shared LLM instruction for ABE Kennzeichnung extraction. */
export const ABE_MARKING_LLM_INSTRUCTION =
  'Kennzeichnung: Transcribe the full section verbatim after the "Kennzeichnung" / "Kennzeichnung am Bauteil" heading. ' +
  "Include every line and table row (e.g. Art der Kennzeichnung, Herstellerzeichen, KBA-Nummer, Nummer, Prüfplakette). " +
  "Put the full block in markingText as multi-line text (`Label: Value` per row). " +
  "Also copy the Herstellerzeichen value into manufacturer when it is the part marking brand. " +
  "You may also set markingType and markingNumber when visible. Do not summarize. Null if not visible.";
