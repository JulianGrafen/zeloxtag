/**
 * External background-removal providers for vehicle side-profiles.
 * Prefer Photoroom when PHOTOROOM_API_KEY is set; else remove.bg.
 */

import { REMOVE_BG_TIMEOUT_MS } from "./silhouette-constants";

export class RemoveBackgroundError extends Error {
  readonly code: "config" | "upstream" | "timeout" | "invalid_response";

  constructor(
    message: string,
    code: RemoveBackgroundError["code"] = "upstream",
  ) {
    super(message);
    this.name = "RemoveBackgroundError";
    this.code = code;
  }
}

export type RemoveBackgroundResult = {
  pngBytes: Uint8Array;
  provider: "photoroom" | "remove_bg";
};

function readPhotoroomKey(): string {
  return process.env.PHOTOROOM_API_KEY?.trim() ?? "";
}

function readRemoveBgKey(): string {
  return (
    process.env.REMOVE_BG_API_KEY?.trim() ||
    process.env.REMOVEBG_API_KEY?.trim() ||
    ""
  );
}

export function isRemoveBackgroundConfigured(): boolean {
  return Boolean(readPhotoroomKey() || readRemoveBgKey());
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new RemoveBackgroundError(
        "Background removal timed out.",
        "timeout",
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function removeWithPhotoroom(
  imageBytes: Uint8Array,
  mime: string,
  filename: string,
): Promise<RemoveBackgroundResult> {
  const apiKey = readPhotoroomKey();
  if (!apiKey) {
    throw new RemoveBackgroundError(
      "PHOTOROOM_API_KEY is not configured.",
      "config",
    );
  }

  const form = new FormData();
  form.append(
    "image_file",
    new Blob([Uint8Array.from(imageBytes)], { type: mime }),
    filename,
  );

  const response = await fetchWithTimeout(
    "https://sdk.photoroom.com/v1/segment",
    {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: form,
    },
    REMOVE_BG_TIMEOUT_MS,
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new RemoveBackgroundError(
      `Photoroom failed (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ""}`,
      "upstream",
    );
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength < 32 || buffer[0] !== 0x89 || buffer[1] !== 0x50) {
    throw new RemoveBackgroundError(
      "Photoroom returned a non-PNG payload.",
      "invalid_response",
    );
  }

  return { pngBytes: buffer, provider: "photoroom" };
}

async function removeWithRemoveBg(
  imageBytes: Uint8Array,
  mime: string,
  filename: string,
): Promise<RemoveBackgroundResult> {
  const apiKey = readRemoveBgKey();
  if (!apiKey) {
    throw new RemoveBackgroundError(
      "REMOVE_BG_API_KEY is not configured.",
      "config",
    );
  }

  const form = new FormData();
  form.append("size", "auto");
  form.append("format", "png");
  form.append(
    "image_file",
    new Blob([Uint8Array.from(imageBytes)], { type: mime }),
    filename,
  );

  const response = await fetchWithTimeout(
    "https://api.remove.bg/v1.0/removebg",
    {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: form,
    },
    REMOVE_BG_TIMEOUT_MS,
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new RemoveBackgroundError(
      `remove.bg failed (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ""}`,
      "upstream",
    );
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength < 32 || buffer[0] !== 0x89 || buffer[1] !== 0x50) {
    throw new RemoveBackgroundError(
      "remove.bg returned a non-PNG payload.",
      "invalid_response",
    );
  }

  return { pngBytes: buffer, provider: "remove_bg" };
}

/**
 * Strip background from a side-profile photo → transparent PNG bytes.
 */
export async function removeImageBackground(input: {
  bytes: Uint8Array;
  mime: string;
  filename: string;
}): Promise<RemoveBackgroundResult> {
  if (readPhotoroomKey()) {
    return removeWithPhotoroom(input.bytes, input.mime, input.filename);
  }
  if (readRemoveBgKey()) {
    return removeWithRemoveBg(input.bytes, input.mime, input.filename);
  }
  throw new RemoveBackgroundError(
    "No background-removal API key configured (PHOTOROOM_API_KEY or REMOVE_BG_API_KEY).",
    "config",
  );
}
