import { describe, expect, it } from "vitest";

import {
  buildMintPlaqueExcelRows,
  mintPlaqueExcelFilename,
  plaqueTagArchiveFilename,
} from "@/lib/tags/mint-plaque-excel";
import { plaqueSvgFilename } from "@/lib/tags/plaque-qr";

const SAMPLE_UUID = "16a97eac-b92d-482a-9db3-6bf1226a7c3e";

describe("mint-plaque-excel", () => {
  it("builds archive filenames like the operator template", () => {
    expect(plaqueTagArchiveFilename(1, SAMPLE_UUID)).toBe(
      `tag_001_${plaqueSvgFilename(SAMPLE_UUID)}`,
    );
    expect(plaqueTagArchiveFilename(25, SAMPLE_UUID)).toBe(
      `tag_025_${plaqueSvgFilename(SAMPLE_UUID)}`,
    );
  });

  it("names export files with date stamp", () => {
    expect(
      mintPlaqueExcelFilename(new Date("2026-09-09T12:00:00Z")),
    ).toBe("2026_09_09_zelox_tags_QR_Code.xlsx");
  });

  it("maps rows to production scan URLs", () => {
    const [row] = buildMintPlaqueExcelRows([SAMPLE_UUID], "https://app.zeloxtag.de");
    expect(row).toMatchObject({
      sequence: 1,
      sourceFilename: plaqueSvgFilename(SAMPLE_UUID),
      archiveFilename: plaqueTagArchiveFilename(1, SAMPLE_UUID),
      scanUrl: `https://app.zeloxtag.de/v/${SAMPLE_UUID}`,
    });
  });
});
