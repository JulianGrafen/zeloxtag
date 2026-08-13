import type {
  AzureLayoutAnalyzeResult,
  AzureLayoutBoundingRegion,
  AzureLayoutTable,
  AzurePolygon,
} from "./azure-document-intelligence";

export type AxisAlignedBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type HorizontalLineSegment = {
  x1: number;
  y: number;
  x2: number;
};

export type RowZebraBand = AxisAlignedBounds & {
  /** 0-based index among non-header data rows (drives alternating fill). */
  dataRowIndex: number;
};

export type RowLeftMarker = {
  /** Z01, Z02, … — vision guide labels (not Pos column). */
  label: string;
  centerY: number;
  anchorX: number;
};

function polygonBounds(polygon: AzurePolygon): AxisAlignedBounds | null {
  if (!polygon || polygon.length < 4) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let index = 0; index + 1 < polygon.length; index += 2) {
    const x = polygon[index]!;
    const y = polygon[index + 1]!;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  return { minX, minY, maxX, maxY };
}

function boundsFromRegions(
  regions: AzureLayoutBoundingRegion[] | undefined,
  pageNumber = 1,
): AxisAlignedBounds | null {
  if (!regions?.length) return null;

  let merged: AxisAlignedBounds | null = null;
  for (const region of regions) {
    if (region.pageNumber !== pageNumber) continue;
    const bounds = polygonBounds(region.polygon);
    if (!bounds) continue;
    if (!merged) {
      merged = bounds;
      continue;
    }
    merged = {
      minX: Math.min(merged.minX, bounds.minX),
      minY: Math.min(merged.minY, bounds.minY),
      maxX: Math.max(merged.maxX, bounds.maxX),
      maxY: Math.max(merged.maxY, bounds.maxY),
    };
  }

  return merged;
}

function tableScore(table: AzureLayoutTable): number {
  return table.cells.filter((cell) => cell.kind !== "columnHeader").length;
}

/** Pick the densest layout table (same heuristic as line-item extraction). */
export function selectPrimaryInvoiceTable(
  result: AzureLayoutAnalyzeResult,
): AzureLayoutTable | null {
  const tables = [...(result.tables ?? [])]
    .filter((table) => table.rowCount >= 2 && table.columnCount >= 2)
    .sort((a, b) => tableScore(b) - tableScore(a));

  return tables[0] ?? null;
}

function rowBounds(
  table: AzureLayoutTable,
  rowIndex: number,
  pageNumber: number,
): AxisAlignedBounds | null {
  const rowCells = table.cells.filter((cell) => cell.rowIndex === rowIndex);
  let merged: AxisAlignedBounds | null = null;

  for (const cell of rowCells) {
    const bounds = boundsFromRegions(cell.boundingRegions, pageNumber);
    if (!bounds) continue;
    if (!merged) {
      merged = bounds;
      continue;
    }
    merged = {
      minX: Math.min(merged.minX, bounds.minX),
      minY: Math.min(merged.minY, bounds.minY),
      maxX: Math.max(merged.maxX, bounds.maxX),
      maxY: Math.max(merged.maxY, bounds.maxY),
    };
  }

  return merged;
}

function isHeaderRow(table: AzureLayoutTable, rowIndex: number): boolean {
  const rowCells = table.cells.filter((cell) => cell.rowIndex === rowIndex);
  if (rowCells.length === 0) return true;
  return rowCells.every((cell) => cell.kind === "columnHeader");
}

export function rowLabelForDataRowIndex(dataRowIndex: number): string {
  return `Z${String(dataRowIndex + 1).padStart(2, "0")}`;
}

/**
 * Alternating row bands for data rows (skips column-header rows).
 * Coordinates are in Azure page space (pixels for raster images).
 */
export function computeTableRowZebraBands(
  table: AzureLayoutTable,
  pageNumber = 1,
): RowZebraBand[] {
  const tableBounds = boundsFromRegions(table.boundingRegions, pageNumber);
  const bands: RowZebraBand[] = [];
  let dataRowIndex = 0;

  for (let rowIndex = 0; rowIndex < table.rowCount; rowIndex += 1) {
    if (isHeaderRow(table, rowIndex)) continue;
    const bounds = rowBounds(table, rowIndex, pageNumber);
    if (!bounds) continue;

    const minX = tableBounds?.minX ?? bounds.minX;
    const maxX = tableBounds?.maxX ?? bounds.maxX;

    bands.push({
      minX: Math.max(0, Math.floor(minX)),
      minY: Math.max(0, Math.floor(bounds.minY)),
      maxX: Math.ceil(maxX),
      maxY: Math.ceil(bounds.maxY),
      dataRowIndex,
    });
    dataRowIndex += 1;
  }

  return bands;
}

export function computeInvoiceRowZebraBands(
  result: AzureLayoutAnalyzeResult,
  pageNumber = 1,
): RowZebraBand[] {
  const table = selectPrimaryInvoiceTable(result);
  if (!table) return [];
  return computeTableRowZebraBands(table, pageNumber);
}

export function scaleZebraBands(
  bands: RowZebraBand[],
  scaleX: number,
  scaleY: number,
): RowZebraBand[] {
  if (scaleX === 1 && scaleY === 1) return bands;
  return bands.map((band) => ({
    ...band,
    minX: Math.round(band.minX * scaleX),
    minY: Math.round(band.minY * scaleY),
    maxX: Math.round(band.maxX * scaleX),
    maxY: Math.round(band.maxY * scaleY),
  }));
}

/** Orange Z01/Z02 badges left of each data row for vision LLM row anchoring. */
export function computeTableRowLeftMarkers(
  table: AzureLayoutTable,
  pageNumber = 1,
): RowLeftMarker[] {
  return computeTableRowZebraBands(table, pageNumber).map((band) => ({
    label: rowLabelForDataRowIndex(band.dataRowIndex),
    centerY: (band.minY + band.maxY) / 2,
    anchorX: Math.max(4, band.minX - 36),
  }));
}

export function computeInvoiceRowLeftMarkers(
  result: AzureLayoutAnalyzeResult,
  pageNumber = 1,
): RowLeftMarker[] {
  const table = selectPrimaryInvoiceTable(result);
  if (!table) return [];
  return computeTableRowLeftMarkers(table, pageNumber);
}

export function scaleRowLeftMarkers(
  markers: RowLeftMarker[],
  scaleX: number,
  scaleY: number,
): RowLeftMarker[] {
  if (scaleX === 1 && scaleY === 1) return markers;
  return markers.map((marker) => ({
    ...marker,
    centerY: Math.round(marker.centerY * scaleY),
    anchorX: Math.round(marker.anchorX * scaleX),
  }));
}

/**
 * Horizontal separator under each table row (Azure cell polygons).
 * Coordinates are in Azure page space (pixels for raster images).
 */
export function computeTableRowSeparatorLines(
  table: AzureLayoutTable,
  pageNumber = 1,
): HorizontalLineSegment[] {
  const tableBounds = boundsFromRegions(table.boundingRegions, pageNumber);
  const rowBoundsList: AxisAlignedBounds[] = [];

  for (let rowIndex = 0; rowIndex < table.rowCount; rowIndex += 1) {
    const bounds = rowBounds(table, rowIndex, pageNumber);
    if (bounds) rowBoundsList.push(bounds);
  }

  if (rowBoundsList.length === 0) return [];

  const minX = tableBounds?.minX ?? Math.min(...rowBoundsList.map((b) => b.minX));
  const maxX = tableBounds?.maxX ?? Math.max(...rowBoundsList.map((b) => b.maxX));

  const lines: HorizontalLineSegment[] = [];
  const seenY = new Set<number>();

  for (const bounds of rowBoundsList) {
    const y = Math.round(bounds.maxY);
    if (seenY.has(y)) continue;
    seenY.add(y);
    lines.push({
      x1: Math.max(0, Math.floor(minX)),
      y,
      x2: Math.ceil(maxX),
    });
  }

  return lines.sort((a, b) => a.y - b.y);
}

export function computeInvoiceRowSeparatorLines(
  result: AzureLayoutAnalyzeResult,
  pageNumber = 1,
): HorizontalLineSegment[] {
  const table = selectPrimaryInvoiceTable(result);
  if (!table) return [];
  return computeTableRowSeparatorLines(table, pageNumber);
}

export function scaleSeparatorLines(
  lines: HorizontalLineSegment[],
  scaleX: number,
  scaleY: number,
): HorizontalLineSegment[] {
  if (scaleX === 1 && scaleY === 1) return lines;
  return lines.map((line) => ({
    x1: Math.round(line.x1 * scaleX),
    y: Math.round(line.y * scaleY),
    x2: Math.round(line.x2 * scaleX),
  }));
}

export function resolveAzurePageScale(
  pageWidth: number | undefined,
  pageHeight: number | undefined,
  imageWidth: number,
  imageHeight: number,
): { scaleX: number; scaleY: number } {
  if (!pageWidth || !pageHeight || pageWidth <= 0 || pageHeight <= 0) {
    return { scaleX: 1, scaleY: 1 };
  }
  return {
    scaleX: imageWidth / pageWidth,
    scaleY: imageHeight / pageHeight,
  };
}
