import { headers } from "next/headers";

/** Canonical production app origin (password-reset + QR targets). */
export const PRODUCTION_SITE_URL = "https://app.zeloxtag.de";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function normalizeOrigin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return stripTrailingSlash(trimmed);
  }
  return stripTrailingSlash(`https://${trimmed.replace(/^\/\//, "")}`);
}

/** Known deployment origins we may safely put into auth emails. */
function allowedOrigins(): string[] {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    PRODUCTION_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_URL,
  ];
  return [
    ...new Set(
      candidates
        .map((value) => (value ? normalizeOrigin(value) : ""))
        .filter(Boolean),
    ),
  ];
}

/**
 * Absolute site origin for auth redirects (password-reset links, etc.).
 *
 * Production emails always prefer `https://app.zeloxtag.de` so links never
 * point at a stale `*.vercel.app` deployment.
 */
export async function getSiteUrl(): Promise<string> {
  const allowed = allowedOrigins();
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";

  if (host) {
    const proto =
      headerStore.get("x-forwarded-proto") ??
      (host.includes("localhost") ? "http" : "https");
    const requestOrigin = normalizeOrigin(`${proto}://${host}`);

    // On the live custom domain (or when SITE_URL matches), use that host.
    if (allowed.includes(requestOrigin) || host.includes("localhost")) {
      // Prefer canonical production when the request is already production.
      if (
        requestOrigin === PRODUCTION_SITE_URL ||
        host === "app.zeloxtag.de"
      ) {
        return PRODUCTION_SITE_URL;
      }
      return requestOrigin;
    }
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL
    ? normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL)
    : "";

  // Never fall back to a dead *.vercel.app when production domain is known.
  if (configured && !configured.endsWith(".vercel.app")) {
    return configured;
  }

  return PRODUCTION_SITE_URL;
}
