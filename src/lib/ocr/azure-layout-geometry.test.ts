import { describe, expect, it } from "vitest";

import type {
  AzureLayoutAnalyzeResult,
  AzureLayoutTable,
} from "@/lib/ocr/azure-document-intelligence";
import {
  computeInvoiceRowLeftMarkers,
  computeInvoiceRowSeparatorLines,
  computeTableRowLeftMarkers,
  computeTableRowSeparatorLines,
  computeTableRowZebraBands,
  rowLabelForDataRowIndex,
  scaleRowLeftMarkers,
  scaleSeparatorLines,
  scaleZebraBands,
} from "@/lib/ocr/azure-layout-geometry";

function cell(
  rowIndex: number,
  columnIndex: number,
  kind: "columnHeader" | "content",
  polygon: number[],
) {
  return {
    rowIndex,
    columnIndex,
    kind,
    content: kind === "columnHeader" ? "Header" : "Item",
    boundingRegions: [{ pageNumber: 1, polygon }],
  };
}

describe("computeTableRowSeparatorLines", () => {
  it("draws one horizontal line per table row at row bottom", () => {
    const table = {
      rowCount: 3,
      columnCount: 2,
      boundingRegions: [
        {
          pageNumber: 1,
          polygon: [0, 0, 400, 0, 400, 120, 0, 120],
        },
      ],
      cells: [
        {
          rowIndex: 0,
          columnIndex: 0,
          content: "Pos",
          boundingRegions: [
            { pageNumber: 1, polygon: [0, 0, 40, 0, 40, 20, 0, 20] },
          ],
        },
        {
          rowIndex: 0,
          columnIndex: 1,
          content: "Bezeichnung",
          boundingRegions: [
            { pageNumber: 1, polygon: [40, 0, 400, 0, 400, 20, 40, 20] },
          ],
        },
        {
          rowIndex: 1,
          columnIndex: 0,
          content: "1",
          boundingRegions: [
            { pageNumber: 1, polygon: [0, 20, 40, 20, 40, 50, 0, 50] },
          ],
        },
        {
          rowIndex: 1,
          columnIndex: 1,
          content: "Sportfedern",
          boundingRegions: [
            { pageNumber: 1, polygon: [40, 20, 400, 20, 400, 50, 40, 50] },
          ],
        },
        {
          rowIndex: 2,
          columnIndex: 0,
          content: "2",
          boundingRegions: [
            { pageNumber: 1, polygon: [0, 50, 40, 50, 40, 80, 0, 80] },
          ],
        },
        {
          rowIndex: 2,
          columnIndex: 1,
          content: "Arbeitslohn",
          boundingRegions: [
            { pageNumber: 1, polygon: [40, 50, 400, 50, 400, 80, 40, 80] },
          ],
        },
      ],
    };

    expect(computeTableRowSeparatorLines(table)).toEqual([
      { x1: 0, y: 20, x2: 400 },
      { x1: 0, y: 50, x2: 400 },
      { x1: 0, y: 80, x2: 400 },
    ]);
  });
});

describe("computeInvoiceRowSeparatorLines", () => {
  it("uses the densest table in the layout result", () => {
    const result: AzureLayoutAnalyzeResult = {
      content: "",
      pages: [{ pageNumber: 1, width: 800, height: 600 }],
      tables: [
        {
          rowCount: 2,
          columnCount: 2,
          cells: [
            {
              rowIndex: 0,
              columnIndex: 0,
              content: "A",
              boundingRegions: [
                { pageNumber: 1, polygon: [0, 0, 100, 0, 100, 10, 0, 10] },
              ],
            },
            {
              rowIndex: 1,
              columnIndex: 0,
              content: "B",
              boundingRegions: [
                { pageNumber: 1, polygon: [0, 10, 100, 10, 100, 20, 0, 20] },
              ],
            },
          ],
        },
      ],
    };

    expect(computeInvoiceRowSeparatorLines(result)).toEqual([
      { x1: 0, y: 10, x2: 100 },
      { x1: 0, y: 20, x2: 100 },
    ]);
  });
});

describe("scaleSeparatorLines", () => {
  it("scales coordinates to image pixel space", () => {
    expect(
      scaleSeparatorLines([{ x1: 10, y: 20, x2: 100 }], 2, 2),
    ).toEqual([{ x1: 20, y: 40, x2: 200 }]);
  });
});

describe("computeTableRowZebraBands", () => {
  it("skips header rows and numbers data rows for alternating fills", () => {
    const table: AzureLayoutTable = {
      rowCount: 4,
      columnCount: 3,
      cells: [
        cell(0, 0, "columnHeader", [0, 0, 100, 0, 100, 10, 0, 10]),
        cell(0, 1, "columnHeader", [100, 0, 200, 0, 200, 10, 100, 10]),
        cell(1, 0, "content", [0, 12, 100, 12, 100, 30, 0, 30]),
        cell(1, 1, "content", [100, 12, 200, 12, 200, 30, 100, 30]),
        cell(2, 0, "content", [0, 32, 100, 32, 100, 50, 0, 50]),
        cell(2, 1, "content", [100, 32, 200, 32, 200, 50, 100, 50]),
        cell(3, 0, "content", [0, 52, 100, 52, 100, 70, 0, 70]),
        cell(3, 1, "content", [100, 52, 200, 52, 200, 70, 100, 70]),
      ],
      boundingRegions: [{ pageNumber: 1, polygon: [0, 0, 200, 0, 200, 70, 0, 70] }],
    };

    const bands = computeTableRowZebraBands(table, 1);

    expect(bands).toHaveLength(3);
    expect(bands.map((band) => band.dataRowIndex)).toEqual([0, 1, 2]);
    expect(bands[0]).toMatchObject({ minY: 12, maxY: 30, dataRowIndex: 0 });
  });
});

describe("computeTableRowLeftMarkers", () => {
  it("assigns Z01/Z02 labels left of each data row top-to-bottom", () => {
    const table: AzureLayoutTable = {
      rowCount: 3,
      columnCount: 2,
      cells: [
        cell(0, 0, "columnHeader", [40, 0, 400, 0, 400, 20, 40, 20]),
        cell(1, 0, "content", [40, 20, 400, 20, 400, 50, 40, 50]),
        cell(2, 0, "content", [40, 50, 400, 50, 400, 80, 40, 80]),
      ],
      boundingRegions: [{ pageNumber: 1, polygon: [40, 0, 400, 0, 400, 80, 40, 80] }],
    };

    expect(computeTableRowLeftMarkers(table, 1)).toEqual([
      { label: "Z01", centerY: 35, anchorX: 4 },
      { label: "Z02", centerY: 65, anchorX: 4 },
    ]);
  });
});

describe("rowLabelForDataRowIndex", () => {
  it("formats zero-padded Z labels", () => {
    expect(rowLabelForDataRowIndex(0)).toBe("Z01");
    expect(rowLabelForDataRowIndex(9)).toBe("Z10");
  });
});

describe("scaleZebraBands", () => {
  it("scales band coordinates to image pixel space", () => {
    const scaled = scaleZebraBands(
      [{ minX: 10, minY: 20, maxX: 110, maxY: 40, dataRowIndex: 0 }],
      2,
      2,
    );

    expect(scaled[0]).toMatchObject({
      minX: 20,
      minY: 40,
      maxX: 220,
      maxY: 80,
      dataRowIndex: 0,
    });
  });
});

describe("scaleRowLeftMarkers", () => {
  it("scales marker coordinates to image pixel space", () => {
    expect(
      scaleRowLeftMarkers([{ label: "Z01", centerY: 35, anchorX: 4 }], 2, 2),
    ).toEqual([{ label: "Z01", centerY: 70, anchorX: 8 }]);
  });
});

describe("computeInvoiceRowLeftMarkers", () => {
  it("uses the densest table in the layout result", () => {
    const result: AzureLayoutAnalyzeResult = {
      content: "",
      pages: [{ pageNumber: 1, width: 800, height: 600 }],
      tables: [
        {
          rowCount: 2,
          columnCount: 2,
          cells: [
            cell(0, 0, "columnHeader", [40, 0, 400, 0, 400, 20, 40, 20]),
            cell(1, 0, "content", [40, 20, 400, 20, 400, 50, 40, 50]),
          ],
        },
      ],
    };

    expect(computeInvoiceRowLeftMarkers(result)).toEqual([
      { label: "Z01", centerY: 35, anchorX: 4 },
    ]);
  });
});
