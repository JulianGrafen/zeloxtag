import { describe, expect, it } from "vitest";

import type { AzureLayoutTable } from "./azure-document-intelligence";
import {
  computeTableRowZebraBands,
  scaleZebraBands,
} from "./azure-layout-geometry";

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
    expect(bands[1]).toMatchObject({ minY: 32, maxY: 50, dataRowIndex: 1 });
    expect(bands[2]).toMatchObject({ minY: 52, maxY: 70, dataRowIndex: 2 });
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
