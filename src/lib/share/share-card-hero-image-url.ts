import {
  resolveApiBaseUrl,
  resolveApiUrl,
} from "@/lib/api/resolve-api-base-url";

/** Resolve story-card image src for fetch / img (native API base + web). */
export function toShareCardImageFetchUrl(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    const base = resolveApiBaseUrl();
    if (typeof window !== "undefined" && base) {
      try {
        if (new URL(base).origin === window.location.origin) {
          return trimmed;
        }
      } catch {
        /* use absolute API base below */
      }
    }
    return resolveApiUrl(trimmed);
  }
  return trimmed;
}
