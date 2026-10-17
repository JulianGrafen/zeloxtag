"use client";

import {
  clearPendingOnboardingVehiclePhoto,
  readPendingOnboardingVehiclePhoto,
} from "@/lib/onboarding/pending-onboarding-vehicle-photo";
import {
  uploadVehiclePhotoClient,
  type VehiclePhotoUploadResult,
} from "@/lib/vehicles/upload-vehicle-photo-client";

const RETRY_DELAYS_MS = [0, 450, 1200];

/**
 * Upload a pending onboarding vehicle photo with short retries (session cookie
 * may not be ready immediately after claim redirect).
 */
export async function flushPendingOnboardingVehiclePhoto(input: {
  vehicleId: string;
  tagUuid?: string;
  isCancelled?: () => boolean;
}): Promise<VehiclePhotoUploadResult | null> {
  const pendingFile = await readPendingOnboardingVehiclePhoto();
  if (!pendingFile) return null;

  for (const delayMs of RETRY_DELAYS_MS) {
    if (input.isCancelled?.()) return null;
    if (delayMs > 0) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, delayMs);
      });
    }
    if (input.isCancelled?.()) return null;

    try {
      const uploaded = await uploadVehiclePhotoClient({
        vehicleId: input.vehicleId,
        tagUuid: input.tagUuid?.trim() || undefined,
        file: pendingFile,
      });
      clearPendingOnboardingVehiclePhoto();
      return uploaded;
    } catch {
      /* retry — keep pending in sessionStorage */
    }
  }

  return null;
}
