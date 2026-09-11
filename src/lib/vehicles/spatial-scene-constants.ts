import { SILHOUETTE_BUCKET } from "@/lib/vehicles/silhouette-constants";

export const SPATIAL_SCENE_BUCKET = SILHOUETTE_BUCKET;
export const SPATIAL_SCENE_VERSION = 1;
export const SPATIAL_LAYER_COUNT = 3;

export type VehicleSpatialSceneMeta = {
  version: number;
  /** Storage object paths in SPATIAL_SCENE_BUCKET (far → near). */
  layers: string[];
};

export function spatialLayerObjectPath(
  vehicleId: string,
  layerIndex: number,
): string {
  return `${vehicleId}/spatial/layer-${layerIndex}.png`;
}

export function spatialLayerObjectPaths(vehicleId: string): string[] {
  return Array.from({ length: SPATIAL_LAYER_COUNT }, (_, index) =>
    spatialLayerObjectPath(vehicleId, index),
  );
}

export function publicSpatialLayerPath(
  vehicleId: string,
  layerIndex: number,
): string {
  return `/api/public/vehicle/${vehicleId}/spatial/${layerIndex}`;
}

export function resolvePublicSpatialLayerUrls(
  vehicleId: string,
  meta: unknown,
): string[] | null {
  const parsed = parseVehicleSpatialSceneMeta(meta);
  if (!parsed) return null;
  return parsed.layers.map((_, index) => publicSpatialLayerPath(vehicleId, index));
}

export function parseVehicleSpatialSceneMeta(
  value: unknown,
): VehicleSpatialSceneMeta | null {
  if (!value || typeof value !== "object") return null;
  const record = value as VehicleSpatialSceneMeta;
  if (!Array.isArray(record.layers) || record.layers.length !== SPATIAL_LAYER_COUNT) {
    return null;
  }
  const layers = record.layers.filter(
    (path): path is string => typeof path === "string" && path.trim().length > 0,
  );
  if (layers.length !== SPATIAL_LAYER_COUNT) return null;
  return {
    version: typeof record.version === "number" ? record.version : SPATIAL_SCENE_VERSION,
    layers,
  };
}
