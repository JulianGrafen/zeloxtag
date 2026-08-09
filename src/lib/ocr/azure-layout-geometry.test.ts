import { describe, expect, it } from "vitest";

import type { AzureLayoutAnalyzeResult } from "@/lib/ocr/azure-document-intelligence";
import {
  computeInvoiceRowSeparatorLines,
  computeTableRowSeparatorLines,
  scaleSeparatorLines,
} from "@/lib/ocr/azure-layout-geometry";

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
