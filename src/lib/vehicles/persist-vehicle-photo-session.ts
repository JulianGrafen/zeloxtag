"use client";

import { cacheBustFromSilhouetteUrl } from "@/lib/vehicles/silhouette-display-url";
import {
  writeSilhouettePreviewToSession,
} from "@/lib/vehicles/silhouette-preview-session";
import { writeSilhouetteToSession } from "@/lib/vehicles/silhouette-session";
import type { VehiclePhotoUploadResult } from "@/lib/vehicles/upload-vehicle-photo-client";

/** Keeps dashboard header in sync after upload (survives full reload / stale RSC). */
export function persistVehiclePhotoUploadToSession(
  vehicleId: string,
  result: Pick<
    VehiclePhotoUploadResult,
    "storageUrl" | "displayUrl" | "previewDataUrl"
  >,
): void {
  const displayBust =
    cacheBustFromSilhouetteUrl(result.displayUrl) ?? Date.now().toString();
  writeSilhouetteToSession(vehicleId, result.storageUrl, displayBust);

  const previewDataUrl = result.previewDataUrl?.trim();
  if (previewDataUrl?.startsWith("data:image/")) {
    writeSilhouettePreviewToSession(vehicleId, previewDataUrl);
  }
}
