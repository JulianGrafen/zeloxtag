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
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site?.startsWith("https://")) return true;
  if (process.env.FORCE_HTTPS_SECURITY === "1") return true;
  return false;
}

/**
 * Build a production-leaning CSP. `'unsafe-inline'` is required for Next.js
 * inline bootstrapping / styled-jsx until a nonce pipeline is wired.
 */
export function buildContentSecurityPolicy(): string {
  const supabase = supabaseHosts();
  const connect = ["'self'", ...supabase].join(" ");
  const img = [
    "'self'",
    "data:",
    "blob:",
    ...supabase.map((h) => h.replace("wss:", "https:")),
  ].join(" ");

  const directives: string[] = [
    "default-src 'self'",
    // Next.js hydration still relies on inline script in many setups.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
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
    // Same-origin only — DocumentViewer embeds PDFs via `/api/documents/file`.
    "frame-src 'self'",
    "child-src 'self'",
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
 * DocumentViewer iframe. Global `X-Frame-Options: DENY` / `frame-ancestors 'none'`
 * would blank the PDF preview.
 */
export function documentFileSecurityHeaderEntries(): Array<{
  key: string;
  value: string;
}> {
  return [
    {
      key: "Content-Security-Policy",
      value: "default-src 'none'; frame-ancestors 'self'",
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
