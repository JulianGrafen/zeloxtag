const OG_IMAGE_FETCH_TIMEOUT_MS = 8_000;

export type OgImageFetchResult =
  | { ok: true; dataUri: string; mimeType: string }
  | { ok: false; reason: "missing_url" | "fetch_failed" | "empty" | "timeout" };

import { imageContentTypeFromBytes } from "@/lib/vehicles/silhouette-bytes";

function mimeFromContentType(contentType: string | null): string {
  const normalized = contentType?.split(";")[0]?.trim().toLowerCase();
  if (normalized === "image/jpeg" || normalized === "image/jpg") {
    return "image/jpeg";
  }
  if (normalized === "image/webp") {
    return "image/webp";
  }
  return "image/png";
}

/** In-memory image bytes → Satori data URI (owner silhouette storage). */
export function bytesToOgImageDataUri(bytes: Uint8Array): OgImageFetchResult {
  if (bytes.byteLength === 0) {
    return { ok: false, reason: "empty" };
  }
  const mimeType = imageContentTypeFromBytes(bytes);
  const base64 = Buffer.from(bytes).toString("base64");
  return { ok: true, dataUri: `data:${mimeType};base64,${base64}`, mimeType };
}

/** Loads a remote hero image for Satori (`<img src={dataUri} />`). */
export async function fetchOgImageDataUri(
  absoluteUrl: string | null,
): Promise<OgImageFetchResult> {
  if (!absoluteUrl?.trim()) {
    return { ok: false, reason: "missing_url" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OG_IMAGE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(absoluteUrl, {
      signal: controller.signal,
      cache: "force-cache",
    });
    if (!response.ok) {
      return { ok: false, reason: "fetch_failed" };
    }
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0) {
      return { ok: false, reason: "empty" };
    }
    const mimeType = mimeFromContentType(response.headers.get("content-type"));
    const base64 = Buffer.from(bytes).toString("base64");
    return { ok: true, dataUri: `data:${mimeType};base64,${base64}`, mimeType };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "fetch_failed" };
  } finally {
    clearTimeout(timeout);
  }
}
