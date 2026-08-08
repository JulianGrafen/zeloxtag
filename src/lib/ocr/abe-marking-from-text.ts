/** Max stored Kennzeichnung text (tables can be long). */
export const ABE_MARKING_TEXT_MAX = 2_000;

const MARKING_HEADING =
  /^(?:Kennzeichnung(?:\s+am\s+Bauteil)?)\s*[:\-]?\s*/i;

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

  const curLines = cur.split("\n").filter(Boolean).length;
  const nextLines = next.split("\n").filter(Boolean).length;
  if (next.length > cur.length) return next;
  if (nextLines > curLines) return next;
  return cur;
}

function pushLabelValue(
  lines: string[],
  label: string,
  value: unknown,
): void {
  if (typeof value !== "string" || !value.trim()) return;
  lines.push(`${label}: ${value.trim()}`);
}

/**
 * Coerce LLM marking payload to verbatim multi-line text (incl. table rows).
 */
export function coerceAbeMarkingText(raw: unknown): string | null {
  if (typeof raw === "string") return normalizeAbeMarkingText(raw);
  if (!raw || typeof raw !== "object") return null;

  const record = raw as Record<string, unknown>;
  const lines: string[] = [];

  pushLabelValue(lines, "Art der Kennzeichnung", record.markingType);
  pushLabelValue(lines, "Art der Kennzeichnung", record.artDerKennzeichnung);
  pushLabelValue(lines, "Nummer", record.markingNumber);
  pushLabelValue(lines, "Nummer", record.nummer);
  pushLabelValue(lines, "Nummer der Kennzeichnung", record.kennzeichnungsnummer);

  if (Array.isArray(record.rows)) {
    for (const row of record.rows) {
      if (Array.isArray(row) && row.length >= 2) {
        const label = String(row[0] ?? "").trim();
        const value = String(row[1] ?? "").trim();
        if (label && value) lines.push(`${label}: ${value}`);
      }
    }
  }

  if (Array.isArray(record.table)) {
    for (const row of record.table) {
      if (Array.isArray(row) && row.length >= 2) {
        const label = String(row[0] ?? "").trim();
        const value = String(row[1] ?? "").trim();
        if (label && value) lines.push(`${label}: ${value}`);
      }
    }
  }

  if (lines.length > 0) return normalizeAbeMarkingText(lines.join("\n"));
  return null;
}

/** Shared LLM instruction for ABE Kennzeichnung extraction. */
export const ABE_MARKING_LLM_INSTRUCTION =
  'Kennzeichnung: Transcribe the full section verbatim after the "Kennzeichnung" / "Kennzeichnung am Bauteil" heading. ' +
  "Include every line and table row (e.g. Art der Kennzeichnung, Nummer, Prüfplakette). " +
  "Format table cells as `Label: Value` lines. Do not summarize or paraphrase. Null if not visible.";
