import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import { storagePathFromPublicOrAuthenticatedUrl } from "@/lib/documents/supabase-storage-url";

export const ENGINE_SOUND_FILE_STEM = "engine-sound" as const;

export const ENGINE_SOUND_EXTENSIONS = ["mp3", "m4a", "wav"] as const;

export type EngineSoundExtension = (typeof ENGINE_SOUND_EXTENSIONS)[number];

export const ENGINE_SOUND_MAX_BYTES = 2 * 1024 * 1024;
export const ENGINE_SOUND_MAX_SECONDS = 10;

export const ENGINE_SOUND_ACCEPT =
  "audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/mp4a-latm,audio/wav,audio/x-wav,audio/wave,.mp3,.m4a,.wav";

const MIME_TO_EXT: Record<string, EngineSoundExtension> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mp4a-latm": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
};

const EXT_TO_CONTENT_TYPE: Record<EngineSoundExtension, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
};

const ENGINE_SOUND_PATH_RE = /\/engine-sound\.(mp3|m4a|wav)$/i;

export function engineSoundExtensionForMime(
  mime: string,
): EngineSoundExtension | null {
  const normalized = mime.toLowerCase().trim().split(";")[0] ?? "";
  return MIME_TO_EXT[normalized] ?? null;
}

export function engineSoundExtensionForFilename(
  filename: string,
): EngineSoundExtension | null {
  const lower = filename.toLowerCase().split("?")[0] ?? "";
  if (lower.endsWith(".m4a")) return "m4a";
  if (lower.endsWith(".mp3")) return "mp3";
  if (lower.endsWith(".wav")) return "wav";
  return null;
}

export function vehicleEngineSoundObjectPath(
  vehicleId: string,
  mime = "audio/mpeg",
): string {
  const ext = engineSoundExtensionForMime(mime) ?? "mp3";
  return `${vehicleId}/${ENGINE_SOUND_FILE_STEM}.${ext}`;
}

export function vehicleEngineSoundCandidatePaths(vehicleId: string): string[] {
  return ENGINE_SOUND_EXTENSIONS.map(
    (ext) => `${vehicleId}/${ENGINE_SOUND_FILE_STEM}.${ext}`,
  );
}

export function isVehicleEngineSoundStoragePath(storagePath: string): boolean {
  return ENGINE_SOUND_PATH_RE.test(storagePath);
}

export function engineSoundContentTypeFromPath(storagePath: string): string {
  const match = storagePath.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = (match?.[1] ?? "mp3") as EngineSoundExtension;
  return EXT_TO_CONTENT_TYPE[ext] ?? "audio/mpeg";
}

export function publicVehicleEngineSoundPath(vehicleId: string): string {
  return `/api/public/vehicle/${vehicleId}/engine-sound`;
}

export function ownerEngineSoundDisplayPath(
  vehicleId: string,
  cacheBust?: string | number | null,
): string {
  const version =
    cacheBust == null || cacheBust === ""
      ? Date.now()
      : String(cacheBust);
  return `/api/vehicle/engine-sound/${vehicleId}?v=${encodeURIComponent(version)}`;
}

export function resolveStoredEngineSoundPath(
  vehicleId: string,
  stored: string | null | undefined,
): string | null {
  const trimmed = stored?.trim();
  if (!trimmed || trimmed.includes("..")) return null;

  const withoutQuery = trimmed.split("?")[0] ?? trimmed;
  if (
    withoutQuery.startsWith(`${vehicleId}/`) &&
    isVehicleEngineSoundStoragePath(withoutQuery)
  ) {
    return withoutQuery;
  }

  const fromUrl = storagePathFromPublicOrAuthenticatedUrl(
    trimmed,
    DOCUMENT_BUCKET,
  );
  if (
    fromUrl &&
    fromUrl.startsWith(`${vehicleId}/`) &&
    isVehicleEngineSoundStoragePath(fromUrl)
  ) {
    return fromUrl;
  }

  return null;
}

export function resolvePublicEngineSoundHref(
  vehicleId: string,
  stored: string | null | undefined,
): string | null {
  const trimmed = stored?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/demo/") || trimmed.startsWith("/api/")) {
    return trimmed;
  }
  if (resolveStoredEngineSoundPath(vehicleId, trimmed)) {
    return publicVehicleEngineSoundPath(vehicleId);
  }
  return null;
}

export function resolveOwnerEngineSoundViewUrl(
  vehicleId: string,
  stored: string | null | undefined,
): string | null {
  const trimmed = stored?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/demo/") || trimmed.startsWith("/api/")) {
    return trimmed;
  }
  return ownerEngineSoundDisplayPath(vehicleId);
}

export { DOCUMENT_BUCKET as ENGINE_SOUND_BUCKET };
