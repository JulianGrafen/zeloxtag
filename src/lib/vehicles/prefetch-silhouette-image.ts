/**
 * Client-side: verify a silhouette URL loads before swapping the dashboard header.
 */
export function prefetchSilhouetteImage(
  url: string,
  timeoutMs = 8_000,
): Promise<boolean> {
  if (typeof window === "undefined" || !url.trim()) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(ok);
    };

    const timer = window.setTimeout(() => finish(false), timeoutMs);
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = url;
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
