import { ENGINE_SOUND_MAX_BYTES } from "@/lib/vehicles/engine-sound-constants";

/** Base64 expands ~4/3 — cap JSON payload size for engine sound uploads. */
export const ENGINE_SOUND_MAX_BASE64_LENGTH =
  Math.ceil(ENGINE_SOUND_MAX_BYTES / 3) * 4 + 128;

export type EngineSoundJsonUploadBody = {
  vehicleId: string;
  tagUuid?: string;
  durationSeconds?: number;
  filename: string;
  mime?: string;
  fileBase64: string;
};

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
