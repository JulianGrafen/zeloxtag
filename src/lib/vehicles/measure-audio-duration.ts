/**
 * Browser-only duration probe for engine sound uploads.
 */
export function measureAudioFileDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";

    const cleanup = () => {
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
    };

    audio.addEventListener("loadedmetadata", () => {
      const duration = audio.duration;
      cleanup();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Dauer der Audiodatei konnte nicht ermittelt werden."));
        return;
      }
      resolve(duration);
    });

    audio.addEventListener("error", () => {
      cleanup();
      reject(new Error("Audiodatei konnte nicht gelesen werden."));
    });

    audio.src = url;
  });
}
