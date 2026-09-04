import { PRODUCTION_SITE_URL } from "@/lib/auth/site-url";

function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed.replace(/^\/\//, "")}`;
}

function isLocalOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local")
    );
  } catch {
    return false;
  }
}

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

/**
 * Canonical app origin for Stripe return URLs, claim links, and QR targets.
 * Never returns localhost when running in production — even if NEXT_PUBLIC_SITE_URL
 * was baked or mis-set during a local deploy.
 */
export function resolvePublicSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
    ? normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL)
    : "";

  if (isProductionRuntime()) {
    if (configured && !isLocalOrigin(configured)) {
      return configured;
    }
    return PRODUCTION_SITE_URL;
  }

  if (configured) return configured;
  return "http://localhost:3000";
}
