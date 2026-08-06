/**
 * Browser-only vehicle cutout via @imgly/background-removal.
 * No third-party removal API — model/WASM run on-device.
 */

import type { Config } from "@imgly/background-removal";

export type CutoutProgress = {
  label: string;
  /** 0–100 */
  progress: number;
};

const LOCAL_REMOVAL_TIMEOUT_MS = 180_000;

export function cutoutProgressLabel(
  key: string,
  current: number,
  total: number,
): CutoutProgress {
  const percent =
    total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const normalizedKey = key.toLowerCase();

  if (
    normalizedKey.includes("fetch") ||
    normalizedKey.includes("model") ||
    normalizedKey.includes("isnet") ||
    normalizedKey.includes("onnx")
  ) {
    return {
      label:
        percent <= 0 ? "Lade KI-Modell…" : `Lade KI-Modell (${percent}%)`,
      progress: 10 + Math.round((percent / 100) * 55),
    };
  }

  if (normalizedKey.includes("compute") || normalizedKey.includes("process")) {
    return {
      label:
        percent <= 0
          ? "Stelle Fahrzeug frei…"
          : `Stelle Fahrzeug frei (${percent}%)`,
      progress: 70 + Math.round((percent / 100) * 25),
    };
  }

  return {
    label:
      percent <= 0
        ? "Bereite KI-Freistellung vor…"
        : `Lade Freistellung (${percent}%)`,
    progress: Math.max(12, percent),
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
 * Runs IMG.LY background removal on-device (CPU WASM).
 * Needs COOP + COEP (require-corp) so SharedArrayBuffer is available on Safari.
 */
export async function removeVehicleBackground(
  image: Blob | File,
  options: RemoveVehicleBackgroundOptions,
): Promise<Blob> {
  const { onProgress, timeoutMs = LOCAL_REMOVAL_TIMEOUT_MS } = options;

  onProgress({ label: "Lade lokale KI-Freistellung…", progress: 4 });

  if (typeof WebAssembly === "undefined") {
    throw new Error("Dieses Gerät unterstützt kein WebAssembly.");
  }

  const { removeBackground } = await import("@imgly/background-removal");

  onProgress({ label: "Starte Freistellung…", progress: 8 });

  const config: Config = {
    model: "isnet_quint8",
    device: "cpu",
    proxyToWorker: false,
    debug: process.env.NODE_ENV === "development",
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
