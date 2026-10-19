import { PRODUCTION_SITE_URL } from "@/lib/constants/public-site-url";

/** Client/server: absolute API origin for Capacitor; empty = same-origin relative paths (web). */
export function resolveApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw) {
    return "";
  }
  return raw.replace(/\/$/, "");
}

/** Builds a fetch URL for app API routes (`/api/...`). */
export function resolveApiUrl(path: string): string {
  const base = resolveApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

/** Canonical public app origin for links (story trust badge, OG absolute URLs). */
export function resolvePublicAppOrigin(): string {
  const fromSite = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromSite) {
    try {
      return new URL(fromSite).origin;
    } catch {
      /* fall through */
    }
  }
  return PRODUCTION_SITE_URL;
}
