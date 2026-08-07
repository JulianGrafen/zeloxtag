import type { TableData } from "@/lib/validations/abeSchema";
import { isPlausibleVehicleApproval } from "@/lib/ocr/abe-parse-schema";
import {
  looksLikeVerwendungsbereichTableDump,
  sanitizeTeilegutachtenCompatibilityTable,
} from "@/lib/validations/teilegutachten-compatibility-table";

const VERWENDUNGSBEREICH_HEADING =
  /(?:^|\n)\s*(?:I+\.\s*)?Verwendungsbereich\b[^\n|]*/i;

const TABLE_SECTION_END =
  /\n\s*(?:(?:II|III|IV|V|VI)\.\s|kennzeichnung\b|technische\s+daten\b|auflagen\b|hinweise\s+für\b|unterschrift\b|(?:---+)?\s*seite\s+\d)/i;

const HEADER_HINT =
  /fahrzeugher|hersteller|handels|bezeichnung|typschl|ausführ|achslast|abe-nr/i;

function parsePipeCells(line: string): string[] | null {
  if (!line.includes("|")) return null;

  const parts = line.split("|").map((cell) => cell.trim());
  if (parts.length > 0 && parts[0] === "") parts.shift();
  if (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
  if (parts.length < 2) return null;

  return parts;
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((cell) => /^[-:\s]+$/.test(cell));
}

function isSectionTitleCell(cell: string): boolean {
  return /^(?:I+\.\s*)?Verwendungsbereich\s*$/i.test(cell.trim());
}

function looksLikeHeaderRow(cells: string[]): boolean {
  return cells.some((cell) => HEADER_HINT.test(cell));
}

function normalizeHeaderRow(cells: string[]): string[] {
  if (cells.length > 1 && isSectionTitleCell(cells[0] ?? "")) {
    return cells.slice(1);
  }

  const first = cells[0] ?? "";
  if (/^(?:I+\.\s*)?Verwendungsbereich\s+/i.test(first)) {
    const stripped = first.replace(/^(?:I+\.\s*)?Verwendungsbereich\s*/i, "").trim();
    return stripped ? [stripped, ...cells.slice(1)] : cells.slice(1);
  }

  return cells;
}

function alignRows(rows: string[][], columnCount: number): string[][] {
  return rows.map((cells) =>
    Array.from({ length: columnCount }, (_, index) => cells[index]?.trim() ?? ""),
  );
}

/**
 * Parse pipe/markdown Verwendungsbereich tables from full OCR text.
 */
export function extractTeilegutachtenCompatibilityTableFromText(
  rawText: string,
): TableData | null {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (text.length < 8) return null;

  const headingMatch = text.match(VERWENDUNGSBEREICH_HEADING);
  const sectionStart =
    headingMatch?.index ??
    text.search(/(?:^|\n)\s*(?:I+\.\s*)?Verwendungsbereich\b/i);
  if (sectionStart < 0) return null;

  const tail = text.slice(sectionStart);
  const endAt = tail.search(TABLE_SECTION_END);
  const section = endAt >= 0 ? tail.slice(0, endAt) : tail.slice(0, 15_000);

  const pipeRows: string[][] = [];
  for (const line of section.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.includes("|")) continue;

    const cells = parsePipeCells(trimmed);
    if (!cells || isSeparatorRow(cells)) continue;

    pipeRows.push(cells);
  }

  if (pipeRows.length === 0) return null;

  const headerSource = pipeRows[0]!;
  const hasHeaderRow = looksLikeHeaderRow(headerSource);

  let headers: string[];
  let dataRows: string[][];

  if (hasHeaderRow) {
    headers = normalizeHeaderRow(headerSource);
    dataRows = pipeRows.slice(1).map((row) => {
      if (row.length > headers.length && isSectionTitleCell(row[0] ?? "")) {
        return row.slice(1);
      }
      return row;
    });
  } else {
    const columnCount = Math.max(...pipeRows.map((row) => row.length));
    headers = Array.from({ length: columnCount }, (_, index) => `Spalte ${index + 1}`);
    dataRows = pipeRows;
  }

  const columnCount = Math.max(
    headers.length,
    ...dataRows.map((row) => row.length),
  );
  if (columnCount === 0 || dataRows.length === 0) return null;

  headers = Array.from({ length: columnCount }, (_, index) => {
    const header = headers[index]?.trim();
    return header && header.length > 0 ? header : `Spalte ${index + 1}`;
  });

  const table: TableData = {
    caption: "Verwendungsbereich",
    headers,
    rows: alignRows(dataRows, columnCount).map((cells, index) => ({
      id: `row-${index + 1}`,
      cells,
      isUserVehicleMatch: false,
      matchReason: null,
    })),
  };

  return sanitizeTeilegutachtenCompatibilityTable(table);
}

/**
 * Plain-text Verwendungsbereich lines (no pipe table) → Freigabe list text.
 */
export function extractTeilegutachtenVerwendungsbereichFromText(
  rawText: string,
): string | null {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (text.length < 8) return null;

  const sectionStart = text.search(
    /(?:^|\n)\s*(?:I+\.\s*)?Verwendungsbereich\b/i,
  );
  if (sectionStart < 0) return null;

  const tail = text.slice(sectionStart);
  const endAt = tail.search(TABLE_SECTION_END);
  const section = endAt >= 0 ? tail.slice(0, endAt) : tail.slice(0, 8_000);

  if (section.includes("|")) return null;

  const lines: string[] = [];
  for (const line of section.split("\n")) {
    const trimmed = line
      .trim()
      .replace(/^[-•*]\s*/, "")
      .replace(/\.$/, "");
    if (!trimmed) continue;
    if (/^(?:I+\.\s*)?Verwendungsbereich\b/i.test(trimmed)) continue;
    if (looksLikeVerwendungsbereichTableDump(trimmed)) continue;
    if (isPlausibleVehicleApproval(trimmed)) {
      lines.push(trimmed);
    }
  }

  return lines.length > 0 ? lines.join("\n").slice(0, 2_000) : null;
}
