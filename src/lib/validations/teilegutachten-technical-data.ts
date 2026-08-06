import type { DocumentTechnicalSpec } from "@/types/database";
import type { TableData } from "@/lib/validations/abeSchema";

export const TEILEGUTACHTEN_TECH_CELL_MAX = 1_200;
export const TEILEGUTACHTEN_TECH_LABEL_MAX = 120;
export const TEILEGUTACHTEN_TECH_VALUE_MAX = 800;

function normalizeTableHeader(header: string): string {
  return header
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeCell(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function scoreHeader(header: string, patterns: RegExp[]): number {
  const normalized = normalizeTableHeader(header);
  for (let index = 0; index < patterns.length; index += 1) {
    if (patterns[index]!.test(normalized)) {
      return patterns.length - index;
    }
  }
  return 0;
}

function resolveLabelColumn(headers: string[]): number {
  let bestIndex = 0;
  let bestScore = 0;
  headers.forEach((header, index) => {
    const score = Math.max(
      scoreHeader(header, [
        /^bezeichnung$/i,
        /beschreibung/i,
        /parameter/i,
        /merkmal/i,
        /eigenschaft/i,
        /^angabe$/i,
      ]),
      scoreHeader(header, [/^achse$/i, /^position$/i]),
    );
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

/** Preserve readable table structure; only trim whitespace at edges. */
export function sanitizeTeilegutachtenTechnicalTable(
  table: TableData | null | undefined,
): TableData | null {
  if (!table?.rows.length || !table.headers.length) return null;

  const headers = table.headers
    .map((header) => normalizeCell(header, TEILEGUTACHTEN_TECH_LABEL_MAX))
    .filter(Boolean);
  if (headers.length === 0) return null;

  const rows = table.rows
    .map((row, index) => ({
      id: row.id?.trim().slice(0, 80) || `tech-${index + 1}`,
      cells: row.cells.map((cell) =>
        normalizeCell(cell, TEILEGUTACHTEN_TECH_CELL_MAX),
      ),
      isUserVehicleMatch: false,
      matchReason: null as string | null,
    }))
    .filter((row) => row.cells.some((cell) => cell.length > 0));

  if (rows.length === 0) return null;

  return {
    caption: table.caption?.trim().slice(0, 200) || "Technische Daten",
    headers,
    rows,
  };
}

/** Map structured Technische Daten → `documents.technical_specs` (full text, no mid-sentence cuts). */
export function technicalSpecsFromTeilegutachtenTable(
  table: TableData | null | undefined,
): DocumentTechnicalSpec[] | null {
  const sanitized = sanitizeTeilegutachtenTechnicalTable(table);
  if (!sanitized?.rows.length) return null;

  const labelIndex = resolveLabelColumn(sanitized.headers);
  const specs: DocumentTechnicalSpec[] = [];

  for (const row of sanitized.rows) {
    const cells = row.cells.map((cell) => cell.trim()).filter(Boolean);
    if (cells.length === 0) continue;

    if (sanitized.headers.length === 2 && cells.length >= 2) {
      specs.push({
        label: cells[0]!.slice(0, TEILEGUTACHTEN_TECH_LABEL_MAX),
        value: cells[1]!.slice(0, TEILEGUTACHTEN_TECH_VALUE_MAX),
      });
      continue;
    }

    const label = (cells[labelIndex] ?? cells[0] ?? "Angabe").slice(
      0,
      TEILEGUTACHTEN_TECH_LABEL_MAX,
    );
    const valueCells = cells.filter((_, index) => index !== labelIndex);
    const value = (valueCells.length > 0 ? valueCells.join(" · ") : cells[0]!)
      .slice(0, TEILEGUTACHTEN_TECH_VALUE_MAX);

    if (!label || !value) continue;
    specs.push({ label, value });
    if (specs.length >= 40) break;
  }

  return specs.length > 0 ? specs : null;
}
