/**
 * Path classification for Next.js Proxy auth gates (Zero-Trust).
 * Public QR digital-twin routes stay open; dashboard + owner APIs require a session.
 */

const PUBLIC_EXACT = new Set([
  "/",
  "/login",
  "/login/mfa",
  "/auth/callback",
  "/demo",
  // /qr requires auth — inventory mint must not be anonymous
]);

const PUBLIC_PREFIXES = [
  "/v/", // physical QR scan surface
  "/_next/",
  "/demo/",
];

/** Explicit owner-only API namespace — always authenticated. */
const PROTECTED_API_PREFIXES = ["/api/protected"];

/**
 * Public GET APIs.
 * Document bytes stay allowlisted for QR digital-twin viewers, but the handler
 * enforces active-tag / owner authorization before service-role download.
 */
const PUBLIC_API_GET = new Set(["/api/documents/file"]);

/**
 * No unauthenticated OCR/LLM POST routes — prevents cost abuse + PII extraction.
 * Scan UI runs only for authenticated vehicle owners.
 */
const PUBLIC_API_POST = new Set<string>();

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
  if (
    (method === "GET" || method === "HEAD") &&
    PUBLIC_API_GET.has(pathname)
  ) {
    return false;
  }
  if (method === "POST" && PUBLIC_API_POST.has(pathname)) return false;
  return true;
}

export function isProtectedPagePath(pathname: string): boolean {
  if (pathname === "/qr" || pathname.startsWith("/qr/")) {
    return true;
  }
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return true;
  }
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return true;
  }
  // Legacy owner hubs (not QR-scoped)
  if (
    pathname.startsWith("/abe") ||
    pathname.startsWith("/rechnungen") ||
    pathname.startsWith("/intervalle")
  ) {
    return true;
  }
  return false;
}

export function loginRedirectUrl(origin: string, pathname: string, search: string): string {
  const next = `${pathname}${search}`;
  const url = new URL("/login", origin);
  url.searchParams.set("next", next.startsWith("/") ? next : "/dashboard");
  return url.toString();
}
