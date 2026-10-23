import { describe, expect, it } from "vitest";

import { isShareCardPreviewHeroReady } from "./share-card-preview-hero-ready";

describe("isShareCardPreviewHeroReady", () => {
  it("returns false when export root is missing", () => {
    expect(isShareCardPreviewHeroReady(null)).toBe(false);
  });

  it("returns true when hero img has natural dimensions", () => {
    const root = {
      querySelector: () =>
        ({
          complete: true,
          naturalWidth: 1200,
          naturalHeight: 800,
        }) as HTMLImageElement,
    } as unknown as HTMLElement;

    expect(isShareCardPreviewHeroReady(root)).toBe(true);
  });

  it("returns false when hero img has not loaded", () => {
    const root = {
      querySelector: () =>
        ({
          complete: false,
          naturalWidth: 0,
          naturalHeight: 0,
        }) as HTMLImageElement,
    } as unknown as HTMLElement;

    expect(isShareCardPreviewHeroReady(root)).toBe(false);
  });
});
