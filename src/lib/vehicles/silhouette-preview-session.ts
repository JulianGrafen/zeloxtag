const PREVIEW_PREFIX = "zlx-silhouette-preview:";

export function silhouettePreviewSessionKey(vehicleId: string): string {
  return `${PREVIEW_PREFIX}${vehicleId}`;
}

/** Inline data URL for instant header display when the proxy is slow or failing. */
export function readSilhouettePreviewFromSession(
  vehicleId: string,
): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(silhouettePreviewSessionKey(vehicleId));
    return value?.startsWith("data:image/") ? value : null;
  } catch {
    return null;
  }
}

export function writeSilhouettePreviewToSession(
  vehicleId: string,
  dataUrl: string,
): void {
  if (typeof window === "undefined") return;
  if (!dataUrl.startsWith("data:image/")) return;
  // sessionStorage cap ~5 MB — skip huge previews.
  if (dataUrl.length > 1_200_000) return;
  try {
    sessionStorage.setItem(silhouettePreviewSessionKey(vehicleId), dataUrl);
  } catch {
    /* quota / private mode */
  }
}

export function clearSilhouettePreviewFromSession(vehicleId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(silhouettePreviewSessionKey(vehicleId));
  } catch {
    /* ignore */
  }
}

export async function fileToPreviewDataUrl(file: File): Promise<string | null> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength < 32 || bytes.byteLength > 900_000) return null;
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]!);
    }
    const base64 = btoa(binary);
    const mime = file.type?.startsWith("image/") ? file.type : "image/png";
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}
