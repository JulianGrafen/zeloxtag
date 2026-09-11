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

const MIN_LAYER_BYTES = 128;

export type EnsureVehicleSpatialSceneOptions = {
  /** Replace stored layers even when `spatial_scene` meta already exists. */
  forceRegenerate?: boolean;
};

function logSpatialFailure(
  vehicleId: string,
  reason: string,
  detail?: unknown,
): void {
  if (detail !== undefined) {
    console.warn(`[spatial-scene] ${reason}`, { vehicleId, detail });
    return;
  }
  console.warn(`[spatial-scene] ${reason}`, { vehicleId });
}

async function removeStoredSpatialLayers(
  admin: SupabaseClient,
  meta: ReturnType<typeof parseVehicleSpatialSceneMeta>,
): Promise<void> {
  if (!meta?.layers.length) return;
  await admin.storage.from(SPATIAL_SCENE_BUCKET).remove(meta.layers);
}

async function validateStoredLayers(
  admin: SupabaseClient,
  paths: string[],
): Promise<boolean> {
  for (const objectPath of paths) {
    const { data, error } = await admin.storage
      .from(SPATIAL_SCENE_BUCKET)
      .download(objectPath);
    if (error || !data) return false;
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (bytes.byteLength < MIN_LAYER_BYTES || !isPngBytes(bytes)) {
      return false;
    }
  }
  return true;
}

export async function ensureVehicleSpatialScene(
  admin: SupabaseClient,
  vehicleId: string,
  existingMeta: unknown,
  options?: EnsureVehicleSpatialSceneOptions,
): Promise<
  | { ok: true; meta: ReturnType<typeof parseVehicleSpatialSceneMeta> }
  | { ok: false }
> {
  const forceRegenerate = options?.forceRegenerate === true;
  const parsed = parseVehicleSpatialSceneMeta(existingMeta);

  if (parsed && !forceRegenerate) {
    const valid = await validateStoredLayers(admin, parsed.layers);
    if (valid) {
      return { ok: true, meta: parsed };
    }
    logSpatialFailure(
      vehicleId,
      "stored spatial layers missing or invalid — regenerating",
    );
    await removeStoredSpatialLayers(admin, parsed);
  } else if (parsed && forceRegenerate) {
    await removeStoredSpatialLayers(admin, parsed);
  }

  const bytes = await loadVehicleSilhouetteBytes(vehicleId);
  if (!bytes) {
    logSpatialFailure(vehicleId, "no silhouette bytes in storage");
    return { ok: false };
  }
  if (!isPngBytes(bytes)) {
    logSpatialFailure(vehicleId, "silhouette is not PNG — spatial skipped");
    return { ok: false };
  }

  let layers: Buffer[];
  try {
    layers = await generateSpatialLayersFromPng(Buffer.from(bytes));
  } catch (error) {
    logSpatialFailure(vehicleId, "layer generation failed", error);
    return { ok: false };
  }

  if (layers.length !== SPATIAL_LAYER_COUNT) {
    logSpatialFailure(vehicleId, "unexpected layer count", layers.length);
    return { ok: false };
  }

  for (const layer of layers) {
    if (layer.byteLength < MIN_LAYER_BYTES || !isPngBytes(layer)) {
      logSpatialFailure(vehicleId, "generated layer failed validation");
      return { ok: false };
    }
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
      logSpatialFailure(vehicleId, "storage upload failed", error.message);
      return { ok: false };
    }
  }

  const storageReady = await validateStoredLayers(admin, paths);
  if (!storageReady) {
    logSpatialFailure(vehicleId, "post-upload layer validation failed");
    return { ok: false };
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
    logSpatialFailure(vehicleId, "vehicles.spatial_scene update failed", {
      message: updateError.message,
      code: updateError.code,
    });
    return { ok: false };
  }

  return { ok: true, meta };
}
