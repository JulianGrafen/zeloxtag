import { describe, expect, it } from "vitest";

import {
  parseVehicleSpatialSceneMeta,
  resolvePublicSpatialLayerUrls,
  SPATIAL_LAYER_COUNT,
} from "./spatial-scene-constants";

const vehicleId = "11111111-1111-4111-8111-111111111111";

describe("parseVehicleSpatialSceneMeta", () => {
  it("accepts valid meta", () => {
    const meta = {
      version: 1,
      layers: [
        `${vehicleId}/spatial/layer-0.png`,
        `${vehicleId}/spatial/layer-1.png`,
        `${vehicleId}/spatial/layer-2.png`,
      ],
    };
    expect(parseVehicleSpatialSceneMeta(meta)).toEqual(meta);
  });

  it("rejects wrong layer count", () => {
    expect(
      parseVehicleSpatialSceneMeta({
        version: 1,
        layers: ["a.png"],
      }),
    ).toBeNull();
  });

  it("rejects empty paths", () => {
    const layers = Array.from({ length: SPATIAL_LAYER_COUNT }, (_, i) =>
      i === 1 ? "  " : `${vehicleId}/spatial/layer-${i}.png`,
    );
    expect(parseVehicleSpatialSceneMeta({ version: 1, layers })).toBeNull();
  });
});

describe("resolvePublicSpatialLayerUrls", () => {
  it("maps layers to public API paths", () => {
    const urls = resolvePublicSpatialLayerUrls(vehicleId, {
      version: 1,
      layers: [
        `${vehicleId}/spatial/layer-0.png`,
        `${vehicleId}/spatial/layer-1.png`,
        `${vehicleId}/spatial/layer-2.png`,
      ],
    });
    expect(urls).toEqual([
      `/api/public/vehicle/${vehicleId}/spatial/0`,
      `/api/public/vehicle/${vehicleId}/spatial/1`,
      `/api/public/vehicle/${vehicleId}/spatial/2`,
    ]);
  });

  it("appends cache bust when provided", () => {
    const urls = resolvePublicSpatialLayerUrls(
      vehicleId,
      {
        version: 1,
        layers: [
          `${vehicleId}/spatial/layer-0.png`,
          `${vehicleId}/spatial/layer-1.png`,
          `${vehicleId}/spatial/layer-2.png`,
        ],
      },
      "2026-03-20T12:00:00.000Z",
    );
    expect(urls?.[0]).toBe(
      `/api/public/vehicle/${vehicleId}/spatial/0?v=2026-03-20T12%3A00%3A00.000Z`,
    );
  });
});
