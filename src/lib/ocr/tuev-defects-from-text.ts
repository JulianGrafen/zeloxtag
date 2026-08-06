import type { TuevDefectRow } from "@/lib/validations/documentSchemas";

export const TUEV_CHECKPOINT_PATTERN = /\*?(?:DF|D)?\d+(?:\.\d+)+[a-zA-Z]?/;

const CHECKPOINT_GLOBAL = /\*?(?:DF|D)?\d+(?:\.\d+)+[a-zA-Z]?/g;

const DEFECTS_SECTION_START =
  /(?:\(\d+\)\s*)?(?:Ihr Fahrzeug weist folgende Mängel auf|festgestellte\s+mängel|mängelliste|mängel)\s*[:\n]?\s*/i;

const DEFECTS_SECTION_END =
  /\n\s*(?:Hinweise|Ergebnis|Unterschrift|Seite|nächste\s+hu|prüfplakette\s+erteilt|ohne\s+(?:erhebliche\s+)?mängel)\b/i;

const SKIP_DEFECT_LINE =
  /^(?:\(\d+\)\s*)?(?:Ihr Fahrzeug weist folgende Mängel auf|festgestellte\s+mängel|mängelliste)\s*$/i;

function normalizeCheckpoint(value: string): string {
  return value.replace(/^\*/, "").trim();
}

function parseCheckpointChunk(text: string): TuevDefectRow | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const match = trimmed.match(
    /^(\*?(?:DF|D)?\d+(?:\.\d+)+[a-zA-Z]?)\s*([\s\S]*)$/,
  );
  if (match) {
    const description = match[2]?.trim() ?? "";
    if (!description) return null;
    return {
      checkpoint: normalizeCheckpoint(match[1]!),
      description: description.slice(0, 500),
      severity: null,
    };
  }

  if (trimmed.length < 6) return null;
  return {
    checkpoint: null,
    description: trimmed.slice(0, 500),
    severity: null,
  };
}

function splitChunkByCheckpoints(chunk: string): string[] {
  const matches = [...chunk.matchAll(CHECKPOINT_GLOBAL)];
  if (matches.length === 0) return chunk.trim() ? [chunk.trim()] : [];

  const parts: string[] = [];
  const leading = chunk.slice(0, matches[0]!.index ?? 0).trim();
  if (leading) parts.push(leading);

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
    if (!chunk) continue;

    const severityRaw = parts[index + 1];
    const severity =
      severityRaw === "EM" || severityRaw === "GM" ? severityRaw : null;
    const subChunks = splitChunkByCheckpoints(chunk);

    subChunks.forEach((subChunk, subIndex) => {
      const row = parseCheckpointChunk(subChunk);
      if (!row) return;
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
    const line = rawLine.trim();
    if (!line || SKIP_DEFECT_LINE.test(line)) continue;

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
      if (row) defects.push(row);
      pendingCheckpoint = null;
      continue;
    }

    const row = parseCheckpointChunk(line);
    if (row) defects.push(row);
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

/** Extract HU/AU Mängel as structured rows (Prüfpunkt · Beschreibung · EM/GM). */
export function extractTuevDefectsFromText(
  rawText: string,
): TuevDefectRow[] | null {
  const text = rawText.replace(/\r\n/g, "\n");
  const startMatch = text.match(DEFECTS_SECTION_START);
  if (!startMatch || startMatch.index == null) return null;

  const tail = text.slice(startMatch.index + startMatch[0].length);
  const endMatch = tail.search(DEFECTS_SECTION_END);
  const section = (endMatch >= 0 ? tail.slice(0, endMatch) : tail.slice(0, 8_000))
    .replace(/^\(\d+\)\s*/i, "")
    .trim();

  if (section.length < 8) return null;

  const lineCount = section.split(/\n/).filter((line) => line.trim()).length;
  const parsed =
    lineCount >= 4
      ? parseMultilineDefects(section)
      : parseInlineDefects(section.replace(/\n+/g, " "));

  const merged =
    lineCount >= 4 && parsed.length < 2
      ? parseInlineDefects(section.replace(/\n+/g, " "))
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
