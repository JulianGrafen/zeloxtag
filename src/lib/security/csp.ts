/**
 * Content-Security-Policy builder for ZeloxTag.
 *
 * Nonce-based CSP is applied per request in Proxy (`createProxiedResponse`) so
 * Next.js can attach the nonce to framework scripts during SSR. Static headers
 * in next.config.ts intentionally omit CSP to avoid conflicting policies.
 *
 * Important: never emit `upgrade-insecure-requests` / HSTS unless the deployment
 * is explicitly HTTPS. Those headers break LAN HTTP previews
 * (e.g. http://192.168.x.x:3000/qr) by forcing failed https:// script loads.
 */

import { randomBytes } from "crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Request header read by Next.js when injecting nonces during SSR. */
export const CSP_NONCE_HEADER = "x-nonce";

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

export function generateCspNonce(): string {
  return randomBytes(16).toString("base64");
}

export type BuildContentSecurityPolicyOptions = {
  nonce: string;
  /** Dev-only: React uses eval for enhanced debugging stacks. */
  allowUnsafeEval?: boolean;
  /** Dev-only: HMR / Tailwind may inject inline styles. */
  allowUnsafeInlineStyles?: boolean;
};

/**
 * Build a per-request CSP. Production uses nonce + strict-dynamic for scripts
 * (no unsafe-inline / unsafe-eval). Development keeps unsafe-eval for React.
 */
export function buildContentSecurityPolicy(
  options: BuildContentSecurityPolicyOptions,
): string {
  const isDev = process.env.NODE_ENV === "development";
  const allowUnsafeEval = options.allowUnsafeEval ?? isDev;
  const allowUnsafeInlineStyles = options.allowUnsafeInlineStyles ?? isDev;

  const supabase = supabaseHosts();
  const connect = ["'self'", "blob:", "data:", ...supabase].join(" ");
  const img = [
    "'self'",
    "data:",
    "blob:",
    ...supabase.map((h) => h.replace("wss:", "https:")),
  ].join(" ");

  const scriptParts = ["'self'", `'nonce-${options.nonce}'`, "'strict-dynamic'", "blob:"];
  if (allowUnsafeEval) {
    scriptParts.push("'unsafe-eval'");
  }

  const styleParts = ["'self'"];
  if (allowUnsafeInlineStyles) {
    styleParts.push("'unsafe-inline'");
  } else {
    styleParts.push(`'nonce-${options.nonce}'`);
  }

  const directives: string[] = [
    "default-src 'self'",
    `script-src ${scriptParts.join(" ")}`,
    "script-src-attr 'none'",
    `style-src ${styleParts.join(" ")}`,
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

/** Non-CSP security headers applied on every proxied HTML response. */
export function staticSecurityHeaderEntries(): Array<{ key: string; value: string }> {
  const headers: Array<{ key: string; value: string }> = [
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

function applyStaticSecurityHeaders(response: NextResponse): void {
  for (const { key, value } of staticSecurityHeaderEntries()) {
    response.headers.set(key, value);
  }
}

function buildNonceRequestHeaders(
  request: NextRequest,
  nonce: string,
  csp: string,
): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP_NONCE_HEADER, nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  return requestHeaders;
}

/** Create a NextResponse with per-request nonce CSP for App Router SSR. */
export function createProxiedResponse(request: NextRequest): {
  response: NextResponse;
  nonce: string;
} {
  const nonce = generateCspNonce();
  const csp = buildContentSecurityPolicy({ nonce });
  const requestHeaders = buildNonceRequestHeaders(request, nonce, csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  applyStaticSecurityHeaders(response);
  response.headers.set("Content-Security-Policy", csp);

  return { response, nonce };
}

/** Recreate proxied response after cookie mutation — keeps the same nonce. */
export function recreateProxiedResponse(
  request: NextRequest,
  nonce: string,
): NextResponse {
  const csp = buildContentSecurityPolicy({ nonce });
  const requestHeaders = buildNonceRequestHeaders(request, nonce, csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  applyStaticSecurityHeaders(response);
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

/**
 * @deprecated CSP is set per request in Proxy. Use `staticSecurityHeaderEntries`
 * for next.config routes that bypass Proxy (document viewer, vehicle PNG).
 */
export function securityHeaderEntries(): Array<{ key: string; value: string }> {
  return staticSecurityHeaderEntries();
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
