import { describe, expect, it, vi } from "vitest";

import {
  inlineDocumentProxyUrl,
  openDocumentOriginal,
  resolveDocumentViewUrl,
} from "./viewable-url";

const VEHICLE_ID = "11111111-1111-4111-8111-111111111111";

describe("viewable-url dyno chart routing", () => {
  it("passes owner dyno proxy URLs through without documents/file wrapping", () => {
    const ownerUrl = `/api/vehicle/dyno-chart/${VEHICLE_ID}?v=42`;

    expect(resolveDocumentViewUrl(ownerUrl)).toBe(ownerUrl);
    expect(inlineDocumentProxyUrl(ownerUrl)).toBe(ownerUrl);
  });

  it("passes public dyno proxy URLs through without documents/file wrapping", () => {
    const publicUrl = `/api/public/vehicle/${VEHICLE_ID}/dyno-chart`;

    expect(resolveDocumentViewUrl(publicUrl)).toBe(publicUrl);
    expect(inlineDocumentProxyUrl(publicUrl)).toBe(publicUrl);
  });

  it("maps relative dyno storage paths to the owner dyno proxy", () => {
    const storagePath = `${VEHICLE_ID}/dyno-chart.pdf`;

    expect(resolveDocumentViewUrl(storagePath)).toMatch(
      new RegExp(`^/api/vehicle/dyno-chart/${VEHICLE_ID}\\?v=`),
    );
  });

  it("does not wrap regular documents in dyno handling", () => {
    const documentPath = `${VEHICLE_ID}/${VEHICLE_ID}-invoice.pdf`;

    expect(resolveDocumentViewUrl(documentPath)).toBe(
      `/api/documents/file?path=${encodeURIComponent(documentPath)}`,
    );
  });
});

describe("openDocumentOriginal", () => {
  it("assigns dyno proxy URLs directly", () => {
    const assign = vi.fn();
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { assign } },
    });

    const ownerUrl = `/api/vehicle/dyno-chart/${VEHICLE_ID}?v=1`;
    openDocumentOriginal(ownerUrl);
    expect(assign).toHaveBeenCalledWith(ownerUrl);

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  });
});
