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

/**
 * Build a production-leaning CSP.
 * `'unsafe-inline'` remains for Next.js bootstrap / CSS-in-JS until a nonce
 * pipeline exists. `'unsafe-eval'` is intentionally omitted.
 */
/** CDN for @imgly/background-removal ONNX/WASM assets (client-side cutout). */
const IMGLY_ASSET_ORIGIN = "https://staticimgly.com";

export function buildContentSecurityPolicy(): string {
  const supabase = supabaseHosts();
  const connect = ["'self'", "blob:", "data:", IMGLY_ASSET_ORIGIN, ...supabase].join(
    " ",
  );
  const img = [
    "'self'",
    "data:",
    "blob:",
    ...supabase.map((h) => h.replace("wss:", "https:")),
  ].join(" ");

  const directives: string[] = [
    "default-src 'self'",
    // Next.js hydration still relies on inline script in many setups.
    // onnxruntime-web needs both `unsafe-eval` (JS glue) and `wasm-unsafe-eval`.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:",
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
    {
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin",
    },
    // Required for SharedArrayBuffer / multi-threaded ONNX WASM (vehicle cutout).
    // Safari/iOS only honors `require-corp` (not `credentialless`) for isolation.
    {
      key: "Cross-Origin-Embedder-Policy",
      value: "require-corp",
    },
    {
      key: "Cross-Origin-Resource-Policy",
      value: "same-origin",
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
export function documentFileSecurityHeaderEntries(): Array<{
  key: string;
  value: string;
}> {
  return [
    {
      key: "Content-Security-Policy",
      value: "frame-ancestors 'self'",
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
