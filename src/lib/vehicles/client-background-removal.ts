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
const ASSET_PROBE_TIMEOUT_MS = 8_000;
const PRELOAD_MAX_ATTEMPTS = 2;

export function isCrossOriginIsolated(): boolean {
  if (typeof window === "undefined") return false;
  return window.crossOriginIsolated === true;
}

/** User-facing reason when cutout cannot run (German, mobile-friendly). */
export function getLocalCutoutBlockReason(): string | null {
  if (typeof window === "undefined") {
    return "Freistellung ist nur im Browser verfügbar.";
  }
  if (typeof WebAssembly === "undefined") {
    return "WebAssembly wird von diesem Browser nicht unterstützt.";
  }
  if (!window.isSecureContext) {
    return "Freistellung benötigt HTTPS — bitte die sichere App-URL öffnen (nicht http:// über LAN).";
  }
  if (!window.crossOriginIsolated) {
    return "Browser-Isolation fehlt — Seite neu laden. Auf iPhone: Safari verwenden (nicht In-App-Browser).";
  }
  return null;
}

/** onnxruntime-web needs crossOriginIsolated (COOP + COEP) for SharedArrayBuffer. */
export function isLocalCutoutSupported(): boolean {
  return getLocalCutoutBlockReason() === null;
}

/** Same-origin WASM/ONNX path when postinstall copied assets into /public. */
export function resolveBackgroundRemovalPublicPath(): string {
  if (typeof window === "undefined") return CDN_PUBLIC_PATH;
  return new URL(LOCAL_PUBLIC_PATH, window.location.origin).href;
}

async function probePublicPath(publicPath: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    ASSET_PROBE_TIMEOUT_MS,
  );
  try {
    const response = await fetch(new URL("resources.json", publicPath).href, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

/** Prefer self-hosted assets; fall back to IMG.LY CDN (CORP-opted-in). */
export async function resolveBackgroundRemovalPublicPathWithFallback(): Promise<string> {
  const local = resolveBackgroundRemovalPublicPath();
  if (await probePublicPath(local)) return local;

  console.warn(
    "[vehicle-cutout] local background-removal-data missing — using CDN fallback",
  );
  if (await probePublicPath(CDN_PUBLIC_PATH)) return CDN_PUBLIC_PATH;

  throw new Error(
    "KI-Modell konnte nicht geladen werden — bitte Seite neu laden.",
  );
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

function cutoutConfig(
  publicPath: string,
  onProgress: (status: CutoutProgress) => void,
): Config {
  return {
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
}

export type RemoveVehicleBackgroundOptions = {
  onProgress: (status: CutoutProgress) => void;
  timeoutMs?: number;
};

let preloadPromise: Promise<string> | null = null;
let resolvedPublicPath: string | null = null;

async function preloadWithPath(
  publicPath: string,
  onProgress?: (status: CutoutProgress) => void,
): Promise<void> {
  const { preload } = await import("@imgly/background-removal");
  onProgress?.({ label: "Bereite KI-Freistellung vor…", progress: 2 });
  await preload(cutoutConfig(publicPath, (status) => onProgress?.(status)));
}

/**
 * Warm ONNX/WASM assets (same-origin or CDN) before the user picks a photo.
 */
export async function preloadVehicleBackgroundRemoval(
  onProgress?: (status: CutoutProgress) => void,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isLocalCutoutSupported()) return;
  if (preloadPromise) {
    await preloadPromise;
    return;
  }

  preloadPromise = (async () => {
    const publicPath = await resolveBackgroundRemovalPublicPathWithFallback();
    let lastError: unknown;

    for (let attempt = 1; attempt <= PRELOAD_MAX_ATTEMPTS; attempt += 1) {
      try {
        await preloadWithPath(publicPath, onProgress);
        resolvedPublicPath = publicPath;
        return publicPath;
      } catch (error) {
        lastError = error;
        preloadPromise = null;
        if (attempt < PRELOAD_MAX_ATTEMPTS) {
          console.warn(
            `[vehicle-cutout] preload attempt ${attempt} failed, retrying…`,
            error,
          );
          onProgress?.({ label: "KI-Modell wird erneut geladen…", progress: 1 });
          await new Promise((resolve) => window.setTimeout(resolve, 600));
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("KI-Modell konnte nicht vorbereitet werden.");
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

  const blockReason = getLocalCutoutBlockReason();
  if (blockReason) {
    throw new Error(blockReason);
  }

  const { removeBackground } = await import("@imgly/background-removal");

  onProgress({ label: "Starte Freistellung…", progress: 8 });

  const publicPath =
    resolvedPublicPath ??
    (await resolveBackgroundRemovalPublicPathWithFallback());
  resolvedPublicPath = publicPath;

  const cutout = await Promise.race([
    removeBackground(image, cutoutConfig(publicPath, onProgress)),
    timeoutAfter(timeoutMs),
  ]);

  onProgress({ label: "Freistellung fertig", progress: 100 });
  return cutout;
}
