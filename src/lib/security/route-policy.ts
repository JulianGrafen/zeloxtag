import { AUFLAGEN_KUERZEL_IMAGE_API_PATH } from "@/lib/documents/constants";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import {
  SHOPIFY_WEBHOOK_API_PATH,
  STRIPE_WEBHOOK_API_PATH,
} from "@/lib/billing/constants";

/**
 * Path classification for Next.js Proxy auth gates (Zero-Trust).
 * Public QR digital-twin routes stay open; dashboard + owner APIs require a session.
 */

const PUBLIC_EXACT = new Set([
  "/",
  "/login",
  "/register",
  "/login/mfa",
  "/login/reset",
  "/auth/callback",
  "/auth/confirm",
  "/auth/login/google",
  "/demo",
  "/impressum",
  "/agb",
  "/datenschutz",
  // /login/update-password requires a recovery session (checked in page)
  // /qr requires auth — inventory mint must not be anonymous
  // /auth/continue is protected — resolves owner dashboard after login
]);

const PUBLIC_PREFIXES = [
  "/v/", // physical QR scan surface
  "/expose/", // token-gated sales exposé (never by vehicle id)
  "/einladung/", // Schrauber invite landing (accept requires auth)
  "/abe", // mock ABE showcase (Verwendungsbereich highlight demo)
  "/rechnungen", // mock invoice showcase
  "/intervalle", // mock oil-interval showcase
  "/_next/",
];

/** Explicit owner-only API namespace — always authenticated. */
const PROTECTED_API_PREFIXES = ["/api/protected"];

/**
 * Public GET APIs — shared reference media only.
 * Document bytes (`/api/documents/file`) stay session-gated (fail closed).
 */
const PUBLIC_API_GET = new Set<string>([AUFLAGEN_KUERZEL_IMAGE_API_PATH]);

/** COEP-safe vehicle imagery — no session required (digital twin surface). */
const PUBLIC_API_GET_PREFIXES = [
  "/api/vehicle/silhouette/",
  "/api/vehicle/catalog/",
  "/api/public/vehicle/",
];

export function isPublicVehicleImagePath(
  pathname: string,
  method: string,
): boolean {
  if (method !== "GET" && method !== "HEAD") return false;
  if (PUBLIC_API_GET.has(pathname)) return true;
  return PUBLIC_API_GET_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * No unauthenticated OCR/LLM POST routes — prevents cost abuse + PII extraction.
 * Scan UI runs only for authenticated vehicle owners.
 */
const PUBLIC_API_POST = new Set<string>([
  SHOPIFY_WEBHOOK_API_PATH,
  STRIPE_WEBHOOK_API_PATH,
]);

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return false;
}

export function isProtectedApiPath(pathname: string, method: string): boolean {
  if (!pathname.startsWith("/api/")) return false;

  if (PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  // HEAD probes (devtools / some browsers) must match the public GET allowlist.
  if (method === "GET" || method === "HEAD") {
    if (PUBLIC_API_GET.has(pathname)) return false;
    if (
      PUBLIC_API_GET_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    ) {
      return false;
    }
  }
  if (method === "POST" && PUBLIC_API_POST.has(pathname)) return false;
  return true;
}

const PUBLIC_TAG_SUBPATHS = new Set(["/opengraph-image"]);

/**
 * Owner / Schrauber sub-routes under `/v/{tag}` — require a session at the edge.
 * QR landing (`/v/{tag}` alone) stays public (PrivateTwinGate / showcase).
 */
export function isProtectedVehicleTagSubPath(pathname: string): boolean {
  const match = pathname.match(/^\/v\/([^/]+)(\/[^?#]*)/);
  if (!match) return false;

  const tagUuid = match[1]?.trim() ?? "";
  const subPath = match[2] ?? "";

  if (!subPath || subPath === "/") return false;
  if (PUBLIC_TAG_SUBPATHS.has(subPath)) return false;
  if (isDemoActiveTag(tagUuid) || tagUuid === MOCK_TAG_UUIDS.unclaimed) {
    return false;
  }

  return true;
}

export function isProtectedPagePath(pathname: string): boolean {
  if (isProtectedVehicleTagSubPath(pathname)) {
    return true;
  }
  if (pathname === "/auth/continue") {
    return true;
  }
  if (pathname === "/qr" || pathname.startsWith("/qr/")) {
    return true;
  }
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return true;
  }
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return true;
  }
  return false;
}

export function loginRedirectUrl(origin: string, pathname: string, search: string): string {
  const next = `${pathname}${search}`;
  const url = new URL("/login", origin);
  url.searchParams.set(
    "next",
    next.startsWith("/") ? next : "/auth/continue",
  );
  return url.toString();
}
