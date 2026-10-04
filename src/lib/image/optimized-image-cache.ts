import "server-only";

type CachedImage = {
  body: Buffer;
  contentType: string;
  expiresAt: number;
};

const MAX_ENTRIES = 128;
const TTL_MS = 15 * 60 * 1000;

const cache = new Map<string, CachedImage>();

export function optimizedImageCacheKey(parts: {
  scope: string;
  id: string;
  maxEdgePx: number;
  version: string;
}): string {
  return `${parts.scope}:${parts.id}:${parts.maxEdgePx}:${parts.version}`;
}

export function readOptimizedImageCache(key: string): CachedImage | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit;
}

export function writeOptimizedImageCache(
  key: string,
  body: Buffer,
  contentType: string,
): void {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, {
    body,
    contentType,
    expiresAt: Date.now() + TTL_MS,
  });
}
