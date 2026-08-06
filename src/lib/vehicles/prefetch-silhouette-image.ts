import { isLikelyImageResponse } from "@/lib/vehicles/silhouette-bytes";

/**
 * Client-side: verify a silhouette URL returns PNG bytes before swapping the header.
 * Uses fetch (not Image) so JSON error bodies from the proxy are detected reliably.
 */
export async function prefetchSilhouetteImage(
  url: string,
  options?: { timeoutMs?: number; attempts?: number },
): Promise<boolean> {
  if (typeof window === "undefined" || !url.trim()) {
    return false;
  }

  const timeoutMs = options?.timeoutMs ?? 8_000;
  const attempts = options?.attempts ?? 3;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const target =
      attempt === 0 ? url.trim() : bumpSilhouetteCacheUrl(url.trim());

    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(target, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
      window.clearTimeout(timer);

      if (!response.ok) {
        if (attempt < attempts - 1) {
          await sleep(350 * (attempt + 1));
          continue;
        }
        return false;
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") ?? "";
      if (isLikelyImageResponse(contentType, bytes)) {
        return true;
      }
    } catch {
      /* retry */
    }

    if (attempt < attempts - 1) {
      await sleep(350 * (attempt + 1));
    }
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Append a fresh cache-buster for retry after storage propagation delay. */
export function bumpSilhouetteCacheUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set("v", Date.now().toString());
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}v=${Date.now()}`;
  }
}
