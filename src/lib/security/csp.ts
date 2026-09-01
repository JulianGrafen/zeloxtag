/**
 * Content-Security-Policy builder for ZeloxTag.
 * Keeps Next.js App Router workable while blocking framing / drive-by origins.
 *
 * Important: never emit `upgrade-insecure-requests` / HSTS unless the deployment
 * is explicitly HTTPS. Those headers break LAN HTTP previews
 * (e.g. http://192.168.x.x:3000/qr) by forcing failed https:// script loads.
 */

function supabaseHosts(): string[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    const host = new URL(url).host;
    return [`https://${host}`, `wss://${host}`];
  } catch {
    return [];
  }
}

/** True only for real HTTPS deployments — not local / LAN `next dev`. */
export function isHttpsDeployment(): boolean {
  if (process.env.FORCE_HTTPS_SECURITY === "1") return true;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site?.startsWith("https://")) return true;
  // Vercel production always terminates TLS even if SITE_URL is mis-set.
  if (
    process.env.VERCEL === "1" &&
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV === "production"
  ) {
    return true;
  }
  return false;
}

/** CDN origins removed — vehicle photos no longer use client-side cutout. */

/**
 * Build a production-leaning CSP.
 * `'unsafe-inline'` remains for Next.js bootstrap / CSS-in-JS until a nonce
 * pipeline exists.
 */
export function buildContentSecurityPolicy(): string {
  const supabase = supabaseHosts();
  const connect = ["'self'", "blob:", "data:", ...supabase].join(" ");
  const img = [
    "'self'",
    "data:",
    "blob:",
    ...supabase.map((h) => h.replace("wss:", "https:")),
  ].join(" ");

  const directives: string[] = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${img}`,
    "font-src 'self' data:",
    `connect-src ${connect}`,
    "worker-src 'self' blob:",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Same-origin proxy + blob: previews (scan review / local object URLs).
    "frame-src 'self' blob:",
    "child-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (isHttpsDeployment()) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function securityHeaderEntries(): Array<{ key: string; value: string }> {
  const headers: Array<{ key: string; value: string }> = [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(),
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(self), microphone=(), geolocation=(), payment=()",
    },
    {
      key: "X-DNS-Prefetch-Control",
      value: "off",
    },
  ];

  if (isHttpsDeployment()) {
    headers.unshift({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}

/**
 * Headers for `/api/documents/file` — must be frameable by the same-origin
 * DocumentViewer iframe.
 *
 * Do NOT set `default-src 'none'`: Chrome’s built-in PDF viewer needs to run
 * inside the iframe and shows “Dieser Inhalt ist blockiert” otherwise.
 * Global DENY / frame-ancestors 'none' must not apply to this route
 * (see next.config.ts exclude pattern).
 */
export function documentInlineContentSecurityPolicy(): string {
  // Chrome's PDF viewer needs object-src (not default-src 'none').
  // script-src none blocks PDF OpenAction JS if a polyglot slipped storage.
  return [
    "frame-ancestors 'self'",
    "script-src 'none'",
    "object-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}

/**
 * Headers for COEP-safe vehicle PNG routes (`/api/vehicle/silhouette/*`,
 * `/api/vehicle/catalog/*`). Excluded from global COEP/CORP so route handlers
 * can emit embeddable PNG responses without conflicting CORP values.
 */
export function vehicleImageSecurityHeaderEntries(): Array<{
  key: string;
  value: string;
}> {
  return [
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "Cross-Origin-Resource-Policy",
      value: "same-origin",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
  ];
}

export function documentFileSecurityHeaderEntries(): Array<{
  key: string;
  value: string;
}> {
  return [
    {
      key: "Content-Security-Policy",
      value: documentInlineContentSecurityPolicy(),
    },
    {
      key: "X-Frame-Options",
      value: "SAMEORIGIN",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "Cross-Origin-Resource-Policy",
      value: "same-origin",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
  ];
}
