"use client";

import { fileToPreviewDataUrl } from "@/lib/vehicles/silhouette-preview-session";

export type VehiclePhotoUploadResult = {
  storageUrl: string;
  displayUrl: string;
  previewUrl?: string;
  previewDataUrl?: string;
};
import {
  compressSilhouetteImage,
  SilhouetteCompressionError,
} from "@/lib/vehicles/compress-silhouette-image";

type UploadApiPayload = {
  ok?: boolean;
  error?: string;
  silhouetteImageUrl?: string;
  silhouetteDisplayUrl?: string;
};

function mapUploadError(
  payload: UploadApiPayload | null,
  status: number,
): string {
  const message = payload?.error?.trim();
  if (message) return message;
  if (status === 0) return "Netzwerkfehler beim Hochladen.";
  if (status === 401) return "Sitzung abgelaufen — bitte erneut anmelden.";
  return `Hochladen fehlgeschlagen (${status || "?"}).`;
}

async function materializeUploadFile(file: File): Promise<File> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength < 32) {
    throw new Error("Datei ist leer.");
  }
  return new File([bytes], file.name || "vehicle-photo.png", {
    type: file.type || "application/octet-stream",
    lastModified: Date.now(),
  });
}

export async function uploadVehiclePhotoClient(input: {
  vehicleId: string;
  tagUuid?: string;
  file: File;
}): Promise<VehiclePhotoUploadResult> {
  let compressed: File;
  try {
    compressed = await compressSilhouetteImage(input.file);
  } catch (error) {
    throw new Error(
      error instanceof SilhouetteCompressionError
        ? error.message
        : "Foto konnte nicht vorbereitet werden.",
    );
  }

  const uploadFile = await materializeUploadFile(compressed);
  const body = new FormData();
  body.append("vehicleId", input.vehicleId);
  if (input.tagUuid?.trim()) {
    body.append("tagUuid", input.tagUuid.trim());
  }
  body.append("file", uploadFile, uploadFile.name);

  const response = await fetch("/api/vehicle/photo", {
    method: "POST",
    body,
    credentials: "include",
  });

  let payload: UploadApiPayload | null = null;
  try {
    payload = (await response.json()) as UploadApiPayload;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok || !payload.silhouetteImageUrl) {
    throw new Error(mapUploadError(payload, response.status));
  }

  const storageUrl = payload.silhouetteImageUrl.trim();
  const displayUrl =
    payload.silhouetteDisplayUrl?.trim() || storageUrl;
  const previewUrl = URL.createObjectURL(compressed);
  const previewDataUrl = await fileToPreviewDataUrl(compressed);

  return {
    storageUrl,
    displayUrl,
    previewUrl,
    previewDataUrl: previewDataUrl ?? undefined,
  };
}
