/**
 * Path classification for Next.js Proxy auth gates.
 * Public QR digital-twin routes stay open; dashboard + mutating owner APIs require a session.
 */

const PUBLIC_EXACT = new Set([
  "/",
  "/login",
  "/login/mfa",
  "/auth/callback",
  "/demo",
  "/qr",
]);

const PUBLIC_PREFIXES = [
  "/v/", // physical QR scan surface
  "/_next/",
  "/demo/",
];

/** Public GET APIs (read-only / inventory helpers). */
const PUBLIC_API_GET = new Set([
  "/api/documents/file",
  "/api/tags/next-unclaimed",
]);

/**
 * Public POST APIs used by the physical QR scan → OCR flow.
 * Keys stay server-side; routes are rate-limited. Persistence still checks ownership.
 */
const PUBLIC_API_POST = new Set([
  "/api/documents/analyze",
  "/api/ocr/parse",
  "/api/ocr/parse-abe",
  "/api/ocr/parse-text",
]);

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return false;
}

export function isProtectedApiPath(pathname: string, method: string): boolean {
  if (!pathname.startsWith("/api/")) return false;
  if (method === "GET" && PUBLIC_API_GET.has(pathname)) return false;
  if (method === "POST" && PUBLIC_API_POST.has(pathname)) return false;
  return true;
}

export function isProtectedPagePath(pathname: string): boolean {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return true;
  }
  if (pathname.startsWith("/settings/")) return true;
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
