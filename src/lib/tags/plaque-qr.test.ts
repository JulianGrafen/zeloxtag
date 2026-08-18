import { describe, expect, it } from "vitest";

import {
  isPlaqueTagUuid,
  plaqueScanUrl,
  plaqueSvgFilename,
  renderPlaqueQrSvg,
} from "@/lib/tags/plaque-qr";

const UUID = "75c69a24-753f-4c1e-9798-7063ff40b73f";

describe("plaque QR", () => {
  it("builds the public scan URL", () => {
    expect(plaqueScanUrl("https://app.zeloxtag.de/", UUID)).toBe(
      `https://app.zeloxtag.de/v/${UUID}`,
    );
  });

  it("rejects demo slugs", () => {
    expect(isPlaqueTagUuid("demo-unclaimed-tag")).toBe(false);
    expect(() => plaqueScanUrl("https://app.zeloxtag.de", "demo-unclaimed-tag")).toThrow();
  });

  it("renders an SVG document for laser engraving", async () => {
    const svg = await renderPlaqueQrSvg(plaqueScanUrl("https://app.zeloxtag.de", UUID));
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(plaqueSvgFilename(UUID)).toBe(`zeloxtag-${UUID}.svg`);
  });
});
