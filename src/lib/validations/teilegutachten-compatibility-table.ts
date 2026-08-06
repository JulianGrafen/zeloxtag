import { isPlausibleVehicleApproval } from "@/lib/ocr/abe-parse-schema";
import type { TableData } from "@/lib/validations/abeSchema";

export const TEILEGUTACHTEN_COMPATIBILITY_CELL_MAX = 1_200;
export const TEILEGUTACHTEN_COMPATIBILITY_HEADER_MAX = 120;

/** @deprecated Display uses original document headers now. */
export const TEILEGUTACHTEN_TABLE_HEADERS = [
  "Hersteller",
  "Typ",
  "Modell",
] as const;

type ColumnRole = "brand" | "type" | "model";

const COLUMN_RULES: { role: ColumnRole; patterns: RegExp[] }[] = [
  {
    role: "brand",
    patterns: [
      /fahrzeughersteller/i,
      /fahrzeugher/i,
      /fzg[\s-]*herst/i,
      /^hersteller(?:\/in)?$/i,
      /^marke$/i,
      /^brand$/i,
    ],
  },
  {
    role: "type",
    patterns: [
      /fahrzeug[\s-]*typ/i,
      /typschlussel/i,
      /^schlussel$/i,
      /^typ$/i,
      /^type$/i,
    ],
  },
  {
    role: "model",
    patterns: [
      /handels[\s-]*bezeichnung/i,
      /^bezeichnung$/i,
      /^modell$/i,
      /^fahrzeug$/i,
    ],
  },
];

function normalizeTableHeader(header: string): string {
  return header
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-zäöüß])-\s+([a-zäöüß])/gi, "$1$2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function scoreHeaderForRole(header: string, patterns: RegExp[]): number {
  const normalized = normalizeTableHeader(header);
  for (let index = 0; index < patterns.length; index += 1) {
    if (patterns[index]!.test(normalized)) {
      return patterns.length - index;
    }
  }
  return 0;
}

/** Resolve Verwendungsbereich column indices without confusing Typ vs Modell. */
export function resolveTeilegutachtenTableColumns(
  headers: string[],
): Record<ColumnRole, number> {
  const scores: Record<ColumnRole, { index: number; score: number }> = {
    brand: { index: -1, score: 0 },
    type: { index: -1, score: 0 },
    model: { index: -1, score: 0 },
  };

  headers.forEach((header, index) => {
    for (const rule of COLUMN_RULES) {
      const score = scoreHeaderForRole(header, rule.patterns);
      if (score > scores[rule.role].score) {
        scores[rule.role] = { index, score };
      }
    }
  });

  return {
    brand: scores.brand.index,
    type: scores.type.index,
    model: scores.model.index,
  };
}

/** Positional fallback (0=brand, 1=type, 2=model) when header matching fails entirely. */
export function resolveColumnsWithFallback(
  headers: string[],
): Record<ColumnRole, number> {
  const resolved = resolveTeilegutachtenTableColumns(headers);
  if (resolved.brand >= 0 || resolved.type >= 0 || resolved.model >= 0) {
    return resolved;
  }
  if (headers.length >= 3) {
    return { brand: 0, type: 1, model: 2 };
  }
  return resolved;
}

function normalizeTableCell(cell: string): string {
  return cell
    .replace(/\r\n/g, "\n")
    .trimEnd()
    .slice(0, TEILEGUTACHTEN_COMPATIBILITY_CELL_MAX);
}

function compactCellValue(row: { cells: string[] }, index: number): string {
  if (index < 0 || index >= row.cells.length) return "";
  return row.cells[index]?.trim().replace(/\s+/g, " ") ?? "";
}

function looksLikeBrandCell(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^\[\d+\]$/.test(trimmed)) return false;
  if (/^f\s?\d{2,4}$/i.test(trimmed)) return false;
  if (/^\d{1,4}$/.test(trimmed)) return false;
  if (/^\d+\s*\/\s*\d+/.test(trimmed)) return false;
  if (/^\*\)/.test(trimmed)) return false;
  if (/^alle,?\s*außer/i.test(trimmed)) return false;
  if (/^s\.\s*IV\./i.test(trimmed)) return false;
  if (/\b(?:diesel|kw\s*\/|achslast)\b/i.test(trimmed)) return false;
  if (/^[A-Za-z][\w\s.-]+\([A-Z]{2}\)$/.test(trimmed)) return true;
  return /[a-zäöüß]{2,}/i.test(trimmed);
}

function formatFreigabeLabel(parts: {
  brand: string;
  type: string;
  model: string;
}): string | null {
  const brand = parts.brand.trim();
  const type = parts.type.trim();
  const model = parts.model.trim();

  const segments = [
    brand || null,
    type && type !== brand ? type : null,
    model && model !== brand && model !== type ? model : null,
  ].filter(Boolean) as string[];

  if (segments.length === 0) return null;
  return segments.join(" · ").slice(0, 120);
}

/** True when text is a pipe/markdown table dump rather than clean Freigabe lines. */
export function looksLikeVerwendungsbereichTableDump(
  text: string | null | undefined,
): boolean {
  if (!text?.trim()) return false;
  if (/\|/.test(text)) return true;
  if (/fahrzeughersteller|handels[\s-]*bezeichnung|abe-nr|achslast/i.test(text)) {
    return true;
  }
  if (/^I+\.\s*Verwendungsbereich/i.test(text.trim())) return true;
  return false;
}

/**
 * Preserve Verwendungsbereich table 1:1 — all columns and cell text from the document.
 */
export function sanitizeTeilegutachtenCompatibilityTable(
  table: TableData | null | undefined,
): TableData | null {
  if (!table?.rows.length) return null;

  const columnCount = Math.max(
    table.headers.length,
    ...table.rows.map((row) => row.cells.length),
  );
  if (columnCount === 0) return null;

  const headers =
    table.headers.length > 0
      ? Array.from({ length: columnCount }, (_, index) => {
          const header = table.headers[index]?.trim().slice(0, TEILEGUTACHTEN_COMPATIBILITY_HEADER_MAX);
          return header && header.length > 0 ? header : `Spalte ${index + 1}`;
        })
      : Array.from(
          { length: columnCount },
          (_, index) => `Spalte ${index + 1}`,
        );

  const rows: TableData["rows"] = [];

  for (const [index, row] of table.rows.entries()) {
    const cells = Array.from({ length: columnCount }, (_, cellIndex) =>
      normalizeTableCell(row.cells[cellIndex] ?? ""),
    );
    if (!cells.some((cell) => cell.trim().length > 0)) continue;

    rows.push({
      id: row.id?.trim().slice(0, 80) || `row-${index + 1}`,
      cells,
      isUserVehicleMatch: Boolean(row.isUserVehicleMatch),
      matchReason: row.matchReason?.trim().slice(0, 300) || null,
    });
  }

  if (rows.length === 0) return null;

  return {
    caption: table.caption?.trim().slice(0, 200) || "Verwendungsbereich",
    headers,
    rows,
  };
}

function compactVehicleLabelsFromTable(table: TableData): string[] {
  const columns = resolveColumnsWithFallback(table.headers);
  if (columns.brand < 0 && columns.type < 0 && columns.model < 0) {
    return [];
  }

  let lastBrand = "";
  const labels: string[] = [];

  for (const row of table.rows) {
    let brand = compactCellValue(row, columns.brand);
    if (!looksLikeBrandCell(brand)) {
      brand = lastBrand;
    } else {
      lastBrand = brand;
    }

    const type = compactCellValue(row, columns.type);
    const model = compactCellValue(row, columns.model);
    const label = formatFreigabeLabel({ brand, type, model });
    if (label && isPlausibleVehicleApproval(label)) {
      labels.push(label);
    }
  }

  return labels;
}

/** Map table rows → compact Freigabe labels for `vehicle_approvals`. */
export function vehicleApprovalsFromSanitizedTable(
  table: TableData | null | undefined,
): string[] | null {
  const preserved = sanitizeTeilegutachtenCompatibilityTable(table);
  if (!preserved?.rows.length) return null;

  const labels = compactVehicleLabelsFromTable(preserved);
  return labels.length > 0 ? labels : null;
}

export function formatMatchedVehicleRowFromTable(
  table: TableData | null | undefined,
  matchedRowId?: string | null,
): string | null {
  const preserved = sanitizeTeilegutachtenCompatibilityTable(table);
  if (!preserved?.rows.length) return null;

  const matched =
    preserved.rows.find((row) => row.isUserVehicleMatch) ??
    (matchedRowId
      ? preserved.rows.find((row) => row.id === matchedRowId)
      : undefined) ??
    preserved.rows[0];

  if (!matched) return null;

  const columns = resolveColumnsWithFallback(preserved.headers);
  const brand = compactCellValue(matched, columns.brand);
  const type = compactCellValue(matched, columns.type);
  const model = compactCellValue(matched, columns.model);
  return formatFreigabeLabel({ brand, type, model });
}

function tableRichnessScore(table: TableData): number {
  return table.rows.length * 1_000 + table.headers.length;
}

/** Prefer the richer Verwendungsbereich table (more rows/columns). */
export function mergeTeilegutachtenCompatibilityTables(
  primary: TableData | null | undefined,
  fallback: TableData | null | undefined,
): TableData | null {
  const a = sanitizeTeilegutachtenCompatibilityTable(primary);
  const b = sanitizeTeilegutachtenCompatibilityTable(fallback);

  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;

  return tableRichnessScore(b) > tableRichnessScore(a) ? b : a;
}
