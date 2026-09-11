import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { generateSpatialLayersFromPng } from "@/lib/vehicles/generate-spatial-layers";
import { loadVehicleSilhouetteBytes } from "@/lib/vehicles/load-silhouette-bytes";
import { isPngBytes } from "@/lib/vehicles/silhouette-bytes";
import {
  parseVehicleSpatialSceneMeta,
  SPATIAL_LAYER_COUNT,
  SPATIAL_SCENE_BUCKET,
  SPATIAL_SCENE_VERSION,
  spatialLayerObjectPaths,
} from "@/lib/vehicles/spatial-scene-constants";

export async function ensureVehicleSpatialScene(
  admin: SupabaseClient,
  vehicleId: string,
  existingMeta: unknown,
): Promise<{ ok: true; meta: ReturnType<typeof parseVehicleSpatialSceneMeta> } | { ok: false }> {
  const parsed = parseVehicleSpatialSceneMeta(existingMeta);
  if (parsed) {
    return { ok: true, meta: parsed };
  }

  const bytes = await loadVehicleSilhouetteBytes(vehicleId);
  if (!bytes || !isPngBytes(bytes)) {
    return { ok: false };
  }

  let layers: Buffer[];
  try {
    layers = await generateSpatialLayersFromPng(Buffer.from(bytes));
  } catch {
    return { ok: false };
  }

  if (layers.length !== SPATIAL_LAYER_COUNT) {
    return { ok: false };
  }

  const paths = spatialLayerObjectPaths(vehicleId);
  for (let index = 0; index < SPATIAL_LAYER_COUNT; index += 1) {
    const { error } = await admin.storage
      .from(SPATIAL_SCENE_BUCKET)
      .upload(paths[index], layers[index], {
        contentType: "image/png",
        upsert: true,
        cacheControl: "3600",
      });
    if (error) {
      return { ok: false };
    }
  }

  const meta = {
    version: SPATIAL_SCENE_VERSION,
    layers: paths,
  };

  const { error: updateError } = await admin
    .from("vehicles")
    .update({
      spatial_scene: meta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", vehicleId);

  if (updateError) {
    return { ok: false };
  }

  return { ok: true, meta };
}
