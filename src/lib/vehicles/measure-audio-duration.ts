import { measureEngineSoundDurationSeconds } from "@/lib/vehicles/engine-sound-duration";

const MEASURE_TIMEOUT_MS = 12_000;

function isUsableDuration(duration: number): boolean {
  return Number.isFinite(duration) && duration > 0;
}

/**
 * Browser-only duration probe for engine sound uploads (incl. WAV).
 */
export async function measureAudioFileDurationSeconds(
  file: File,
  preloadedBytes?: Uint8Array,
): Promise<number> {
  const bytes =
    preloadedBytes ?? new Uint8Array(await file.arrayBuffer());
  const fromHeader = measureEngineSoundDurationSeconds(
    bytes,
    file.name,
    file.type,
  );
  if (fromHeader != null && Number.isFinite(fromHeader) && fromHeader > 0) {
    return fromHeader;
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    // WAV often needs more than metadata before duration is known.
    audio.preload = "auto";

    let settled = false;
    const timeoutId = window.setTimeout(() => {
      finish(
        new Error(
          "Dauer der Audiodatei konnte nicht ermittelt werden — bitte kürzere MP3, M4A oder WAV wählen.",
        ),
      );
    }, MEASURE_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
    };

    const finish = (result: number | Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (result instanceof Error) {
        reject(result);
        return;
      }
      resolve(result);
    };

    const tryResolveDuration = () => {
      if (isUsableDuration(audio.duration)) {
        finish(audio.duration);
      }
    };

    audio.addEventListener("loadedmetadata", tryResolveDuration);
    audio.addEventListener("durationchange", tryResolveDuration);
    audio.addEventListener("canplaythrough", tryResolveDuration);
    audio.addEventListener("error", () => {
      finish(new Error("Audiodatei konnte nicht gelesen werden."));
    });

    audio.src = url;
    audio.load();
  });
}
