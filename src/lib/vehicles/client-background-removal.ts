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

const LOCAL_REMOVAL_TIMEOUT_MS = 180_000;

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
      progress: percent == null ? 12 : 12 + Math.round((percent / 100) * 58),
    };
  }

  if (normalizedKey.includes("compute") || normalizedKey.includes("process")) {
    return {
      label:
        percent == null
          ? "Stelle Fahrzeug frei…"
          : `Stelle Fahrzeug frei (${percent}%)`,
      progress: percent == null ? 75 : 70 + Math.round((percent / 100) * 28),
    };
  }

  return {
    label:
      percent == null
        ? "Bereite KI-Freistellung vor…"
        : `Lade Freistellung (${percent}%)`,
    progress: percent == null ? 20 : Math.max(15, percent),
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

function assertCutoutRuntimeSupport(): void {
  if (typeof WebAssembly === "undefined") {
    throw new Error("Dieses Gerät unterstützt kein WebAssembly.");
  }
  // IMG.LY / onnxruntime-web multi-threaded WASM needs SharedArrayBuffer.
  // Without COOP+COEP the session creation fails before useful progress.
  if (typeof SharedArrayBuffer === "undefined") {
    throw new Error(
      "SharedArrayBuffer fehlt (Seite nicht cross-origin isoliert). Bitte App neu laden.",
    );
  }
}

export type RemoveVehicleBackgroundOptions = {
  onProgress: (status: CutoutProgress) => void;
  timeoutMs?: number;
};

/**
 * Runs IMG.LY background removal on-device.
 * Requires COOP + COEP so SharedArrayBuffer is available.
 */
export async function removeVehicleBackground(
  image: Blob | File,
  options: RemoveVehicleBackgroundOptions,
): Promise<Blob> {
  const { onProgress, timeoutMs = LOCAL_REMOVAL_TIMEOUT_MS } = options;

  onProgress({ label: "Prüfe Geräte-Unterstützung…", progress: 2 });
  assertCutoutRuntimeSupport();

  onProgress({ label: "Lade lokale KI-Freistellung…", progress: 5 });

  const { removeBackground } = await import("@imgly/background-removal");

  onProgress({ label: "Starte Freistellung…", progress: 10 });

  const config: Config = {
    model: "isnet_quint8",
    device: "cpu",
    // Threaded WASM uses workers only when WebGPU path is active; keep false
    // so CPU path stays on the main module with SharedArrayBuffer threads.
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
