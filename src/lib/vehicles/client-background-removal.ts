/**
 * Browser-only vehicle cutout via @imgly/background-removal.
 * Keeps CSP/CDN/publicPath choices in one place.
 */

import type { Config } from "@imgly/background-removal";

export type CutoutProgress = {
  label: string;
  /** 0–100; null = indeterminate */
  progress: number | null;
};

const LOCAL_REMOVAL_TIMEOUT_MS = 120_000;

export function cutoutProgressLabel(
  key: string,
  current: number,
  total: number,
): CutoutProgress {
  const percent =
    total > 0 ? Math.min(100, Math.round((current / total) * 100)) : null;
  const normalizedKey = key.toLowerCase();

  if (
    normalizedKey.includes("fetch") ||
    normalizedKey.includes("model") ||
    normalizedKey.includes("isnet") ||
    normalizedKey.includes("onnx")
  ) {
    return {
      label:
        percent == null ? "Lade KI-Modell…" : `Lade KI-Modell (${percent}%)`,
      progress: percent,
    };
  }

  if (normalizedKey.includes("compute") || normalizedKey.includes("process")) {
    return {
      label:
        percent == null
          ? "Stelle Fahrzeug frei…"
          : `Stelle Fahrzeug frei (${percent}%)`,
      progress: percent,
    };
  }

  return {
    label:
      percent == null
        ? "Bereite KI-Freistellung vor…"
        : `Lade Freistellung (${percent}%)`,
    progress: percent,
  };
}

function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    window.setTimeout(
      () => reject(new Error("Lokale Freistellung hat zu lange gedauert.")),
      ms,
    );
  });
}

export type RemoveVehicleBackgroundOptions = {
  onProgress: (status: CutoutProgress) => void;
  timeoutMs?: number;
};

/**
 * Runs IMG.LY background removal in the main thread (no worker proxy).
 * Worker + missing Cross-Origin-Isolation often fails before any progress fires.
 */
export async function removeVehicleBackground(
  image: Blob | File,
  options: RemoveVehicleBackgroundOptions,
): Promise<Blob> {
  const { onProgress, timeoutMs = LOCAL_REMOVAL_TIMEOUT_MS } = options;

  onProgress({ label: "Lade lokale KI-Freistellung…", progress: 2 });

  const { removeBackground } = await import("@imgly/background-removal");

  onProgress({ label: "Starte Freistellung…", progress: 8 });

  const config: Config = {
    model: "isnet_quint8",
    device: "cpu",
    // Default in the library; keep explicit. Worker proxy needs COOP+COEP
    // (SharedArrayBuffer) and often breaks under Next without isolation.
    proxyToWorker: false,
    output: { format: "image/png", quality: 1 },
    progress: (key, current, total) => {
      onProgress(cutoutProgressLabel(key, current, total));
    },
  };

  const cutout = await Promise.race([
    removeBackground(image, config),
    timeoutAfter(timeoutMs),
  ]);

  onProgress({ label: "Freistellung fertig", progress: 100 });
  return cutout;
}
