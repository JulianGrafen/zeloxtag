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

const PACKAGE_VERSION = "1.7.0";
const LOCAL_PUBLIC_PATH = `/background-removal-data/${PACKAGE_VERSION}/dist/`;
const CDN_PUBLIC_PATH = `https://staticimgly.com/@imgly/background-removal-data/${PACKAGE_VERSION}/dist/`;

const LOCAL_REMOVAL_TIMEOUT_MS = 180_000;

export function isCrossOriginIsolated(): boolean {
  if (typeof window === "undefined") return false;
  return window.crossOriginIsolated === true;
}

/** Same-origin WASM/ONNX path when postinstall copied assets into /public. */
export function resolveBackgroundRemovalPublicPath(): string {
  if (typeof window === "undefined") return CDN_PUBLIC_PATH;
  return new URL(LOCAL_PUBLIC_PATH, window.location.origin).href;
}

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

let preloadPromise: Promise<void> | null = null;

/**
 * Warm ONNX/WASM assets (same-origin or CDN) before the user picks a photo.
 */
export async function preloadVehicleBackgroundRemoval(
  onProgress?: (status: CutoutProgress) => void,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (preloadPromise) {
    await preloadPromise;
    return;
  }

  preloadPromise = (async () => {
    const { preload } = await import("@imgly/background-removal");
    const publicPath = resolveBackgroundRemovalPublicPath();
    onProgress?.({ label: "Bereite KI-Freistellung vor…", progress: 2 });
    await preload({
      publicPath,
      model: "isnet_quint8",
      device: "cpu",
      proxyToWorker: false,
      progress: (key, current, total) => {
        onProgress?.(cutoutProgressLabel(key, current, total));
      },
    });
  })().catch((error) => {
    preloadPromise = null;
    throw error;
  });

  await preloadPromise;
}

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

  if (!isCrossOriginIsolated()) {
    throw new Error(
      "KI-Freistellung benötigt eine sichere HTTPS-Verbindung mit Cross-Origin-Isolation. Bitte über https:// öffnen (nicht LAN-HTTP).",
    );
  }

  const { removeBackground } = await import("@imgly/background-removal");

  onProgress({ label: "Starte Freistellung…", progress: 8 });

  const publicPath = resolveBackgroundRemovalPublicPath();

  const config: Config = {
    publicPath,
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
