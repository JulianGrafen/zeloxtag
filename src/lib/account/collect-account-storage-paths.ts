import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import { resolveStoragePath } from "@/lib/documents/storage-path";
import {
  vehicleDynoChartCandidatePaths,
  resolveStoredDynoChartPath,
} from "@/lib/vehicles/dyno-chart-constants";
import {
  legacySilhouetteObjectPath,
  SILHOUETTE_BUCKET,
  vehiclePhotoObjectPath,
} from "@/lib/vehicles/silhouette-constants";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Document, Tag, Vehicle, VehicleEvent } from "@/types/database";

export type StorageObjectRef = {
  bucket: string;
  path: string;
};

export type AccountStorageManifest = {
  exportedAt: string;
  userId: string;
  vehicles: Vehicle[];
  tags: Tag[];
  events: VehicleEvent[];
  documents: Document[];
};

export function collectVehicleDocumentPaths(
  documents: Document[],
): StorageObjectRef[] {
  const refs: StorageObjectRef[] = [];
  const seen = new Set<string>();

  for (const doc of documents) {
    const path = resolveStoragePath(doc.file_url);
    if (!path) continue;
    const key = `${DOCUMENT_BUCKET}:${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ bucket: DOCUMENT_BUCKET, path });
  }

  return refs;
}

export function collectVehicleSilhouettePaths(
  vehicleId: string,
): StorageObjectRef[] {
  const paths = [
    vehiclePhotoObjectPath(vehicleId),
    legacySilhouetteObjectPath(vehicleId),
  ];
  const seen = new Set<string>();
  const refs: StorageObjectRef[] = [];

  for (const path of paths) {
    const key = `${SILHOUETTE_BUCKET}:${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ bucket: SILHOUETTE_BUCKET, path });
  }

  return refs;
}

export function collectVehicleDynoChartPaths(vehicle: Vehicle): StorageObjectRef[] {
  const specs = parseVehicleTechSpecs(vehicle.tech_specs);
  const stored = resolveStoredDynoChartPath(vehicle.id, specs.dynoChartUrl);
  const paths = stored
    ? [stored]
    : vehicleDynoChartCandidatePaths(vehicle.id);

  const seen = new Set<string>();
  const refs: StorageObjectRef[] = [];
  for (const path of paths) {
    const key = `${DOCUMENT_BUCKET}:${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ bucket: DOCUMENT_BUCKET, path });
  }
  return refs;
}

export function collectAccountStoragePaths(input: {
  vehicles: Vehicle[];
  documents: Document[];
}): StorageObjectRef[] {
  const refs: StorageObjectRef[] = [];
  const seen = new Set<string>();

  const push = (ref: StorageObjectRef) => {
    const key = `${ref.bucket}:${ref.path}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push(ref);
  };

  for (const doc of collectVehicleDocumentPaths(input.documents)) {
    push(doc);
  }

  for (const vehicle of input.vehicles) {
    for (const ref of collectVehicleSilhouettePaths(vehicle.id)) {
      push(ref);
    }
    for (const ref of collectVehicleDynoChartPaths(vehicle)) {
      push(ref);
    }
  }

  return refs;
}

export function zipEntryNameForStorageRef(ref: StorageObjectRef): string {
  return `${ref.bucket}/${ref.path}`;
}
