import { headers } from "next/headers";

import { resolvePublicSiteOrigin } from "@/lib/site-origin";

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

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

/**
 * Absolute site origin for auth redirects (OAuth, password-reset links, etc.).
 *
 * In production always prefers the canonical custom domain — never a
 * `*.vercel.app` deployment URL baked into env or inferred from headers.
 */
export async function getSiteUrl(): Promise<string> {
  if (isProductionRuntime()) {
    return resolvePublicSiteOrigin();
  }

  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";

  if (host) {
    const proto =
      headerStore.get("x-forwarded-proto") ??
      (host.includes("localhost") ? "http" : "https");
    return normalizeOrigin(`${proto}://${host}`);
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL
    ? normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL)
    : "";

  if (configured) return configured;
  return "http://localhost:3000";
}
