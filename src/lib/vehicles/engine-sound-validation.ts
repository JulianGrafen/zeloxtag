import {
  ENGINE_SOUND_MAX_BYTES,
  ENGINE_SOUND_MAX_SECONDS,
  engineSoundExtensionForFilename,
  engineSoundExtensionForMime,
} from "@/lib/vehicles/engine-sound-constants";

const ALLOWED_MIME_PREFIXES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/mp4a-latm",
] as const;

export type EngineSoundValidationResult =
  | { ok: true; mime: string; extension: "mp3" | "m4a" }
  | { ok: false; error: string };

function normalizeMime(mime: string): string {
  return mime.toLowerCase().trim().split(";")[0] ?? "";
}

export function isAllowedEngineSoundMime(mime: string): boolean {
  const normalized = normalizeMime(mime);
  return ALLOWED_MIME_PREFIXES.some((allowed) => normalized === allowed);
}

export function validateEngineSoundMeta(
  mime: string,
  filename: string,
  sizeBytes: number,
  durationSeconds?: number | null,
): EngineSoundValidationResult {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: "Leere Audiodatei." };
  }
  if (sizeBytes > ENGINE_SOUND_MAX_BYTES) {
    return {
      ok: false,
      error: "Soundcheck darf maximal 2 MB groß sein.",
    };
  }

  const extFromName = engineSoundExtensionForFilename(filename);
  const mimeOk = isAllowedEngineSoundMime(mime);
  if (!mimeOk && !extFromName) {
    return {
      ok: false,
      error: "Nur MP3 oder M4A werden unterstützt.",
    };
  }

  const extension = extFromName ?? engineSoundExtensionForMime(mime);
  if (extension !== "mp3" && extension !== "m4a") {
    return {
      ok: false,
      error: "Nur MP3 oder M4A werden unterstützt.",
    };
  }

  if (durationSeconds != null) {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return { ok: false, error: "Audiodatei konnte nicht gelesen werden." };
    }
    if (durationSeconds > ENGINE_SOUND_MAX_SECONDS) {
      return {
        ok: false,
        error: `Soundcheck darf maximal ${ENGINE_SOUND_MAX_SECONDS} Sekunden lang sein.`,
      };
    }
  }

  const resolvedMime =
    mimeOk ? normalizeMime(mime) : extension === "m4a" ? "audio/mp4" : "audio/mpeg";

  return { ok: true, mime: resolvedMime, extension };
}
