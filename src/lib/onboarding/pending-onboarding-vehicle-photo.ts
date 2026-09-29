"use client";

import { compressSilhouetteImage } from "@/lib/vehicles/compress-silhouette-image";

const PENDING_PHOTO_KEY = "zlx-onboarding-pending-photo";
const PENDING_PHOTO_SKIP_KEY = "zlx-onboarding-pending-photo-skipped";

type StoredPhoto = {
  mime: string;
  base64: string;
  name: string;
};

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function storePendingOnboardingVehiclePhoto(
  file: File,
): Promise<void> {
  if (typeof window === "undefined") return;
  const compressed = await compressSilhouetteImage(file);
  const bytes = new Uint8Array(await compressed.arrayBuffer());
  if (bytes.byteLength > 900_000) return;
  const payload: StoredPhoto = {
    mime: compressed.type || "image/png",
    base64: toBase64(bytes),
    name: compressed.name || "vehicle-photo.png",
  };
  try {
    sessionStorage.setItem(PENDING_PHOTO_KEY, JSON.stringify(payload));
    sessionStorage.removeItem(PENDING_PHOTO_SKIP_KEY);
  } catch {
    /* quota */
  }
}

export async function readPendingOnboardingVehiclePhoto(): Promise<File | null> {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_PHOTO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPhoto;
    if (
      typeof parsed.base64 !== "string" ||
      typeof parsed.mime !== "string" ||
      typeof parsed.name !== "string"
    ) {
      return null;
    }
    const bytes = fromBase64(parsed.base64);
    const copy = new Uint8Array(bytes);
    return new File([copy], parsed.name, {
      type: parsed.mime,
      lastModified: Date.now(),
    });
  } catch {
    return null;
  }
}

export function clearPendingOnboardingVehiclePhoto(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_PHOTO_KEY);
  } catch {
    /* ignore */
  }
}

export function markOnboardingVehiclePhotoSkipped(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_PHOTO_SKIP_KEY, "1");
    sessionStorage.removeItem(PENDING_PHOTO_KEY);
  } catch {
    /* ignore */
  }
}

export function readOnboardingVehiclePhotoSkipped(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(PENDING_PHOTO_SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearOnboardingVehiclePhotoSkipped(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_PHOTO_SKIP_KEY);
  } catch {
    /* ignore */
  }
}
