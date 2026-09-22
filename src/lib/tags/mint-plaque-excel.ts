import ExcelJS from "exceljs";

import {
  plaqueProductionOrigin,
  plaqueScanUrl,
  plaqueSvgFilename,
  renderPlaqueQrPngBuffer,
} from "@/lib/tags/plaque-qr";

export const MINT_PLAQUE_EXCEL_SHEET_NAME = "ZELOX Tags";

const HEADERS = [
  "Nr",
  "Quelldatei",
  "Tag-Dateiname",
  "Tag-Vorschau",
  "QR Code",
] as const;

/** Laser batch name: `tag_001_zeloxtag-{uuid}.svg` */
export function plaqueTagArchiveFilename(sequence: number, uuid: string): string {
  const id = uuid.trim();
  const num = String(sequence).padStart(3, "0");
  return `tag_${num}_${plaqueSvgFilename(id)}`;
}

/** Matches operator export naming: `2026_09_09_zelox_tags_QR_Code.xlsx` */
export function mintPlaqueExcelFilename(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}_${m}_${d}_zelox_tags_QR_Code.xlsx`;
}

export type MintPlaqueExcelRow = {
  sequence: number;
  uuid: string;
  scanUrl: string;
  sourceFilename: string;
  archiveFilename: string;
};

export function buildMintPlaqueExcelRows(
  uuids: string[],
  scanOrigin?: string,
): MintPlaqueExcelRow[] {
  const origin = scanOrigin ?? plaqueProductionOrigin();
  return uuids.map((uuid, index) => {
    const scanUrl = plaqueScanUrl(origin, uuid);
    const sequence = index + 1;
    return {
      sequence,
      uuid: uuid.trim(),
      scanUrl,
      sourceFilename: plaqueSvgFilename(uuid),
      archiveFilename: plaqueTagArchiveFilename(sequence, uuid),
    };
  });
}

/**
 * Operator Excel like `2026_09_09_zelox_tags_QR_Code.xlsx`: filenames + scan URLs + QR preview PNGs.
 */
export async function buildMintPlaqueExcelBuffer(
  uuids: string[],
  options?: { scanOrigin?: string },
): Promise<Buffer> {
  if (uuids.length === 0) {
    throw new Error("Excel-Export benötigt mindestens einen Tag.");
  }

  const rows = buildMintPlaqueExcelRows(uuids, options?.scanOrigin);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(MINT_PLAQUE_EXCEL_SHEET_NAME);

  sheet.columns = [
    { key: "nr", width: 8 },
    { key: "source", width: 48 },
    { key: "archive", width: 52 },
    { key: "preview", width: 24 },
    { key: "url", width: 56 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.values = [...HEADERS];
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle" };

  for (const row of rows) {
    const excelRowIndex = row.sequence + 1;
    const dataRow = sheet.getRow(excelRowIndex);
    dataRow.height = 132;
    dataRow.getCell(1).value = row.sequence;
    dataRow.getCell(2).value = row.sourceFilename;
    dataRow.getCell(3).value = row.archiveFilename;

    const urlCell = dataRow.getCell(5);
    urlCell.value = {
      text: row.scanUrl,
      hyperlink: row.scanUrl,
    };
    urlCell.font = { color: { argb: "FF0563C1" }, underline: true };

    const pngBuffer = await renderPlaqueQrPngBuffer(row.scanUrl);
    const imageId = workbook.addImage({
      buffer: pngBuffer as unknown as ExcelJS.Buffer,
      extension: "png",
    });
    sheet.addImage(imageId, {
      tl: { col: 3, row: excelRowIndex - 1 },
      ext: { width: 165, height: 165 },
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
