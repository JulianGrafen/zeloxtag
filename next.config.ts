import type { NextConfig } from "next";

import {
  documentFileSecurityHeaderEntries,
  securityHeaderEntries,
} from "./src/lib/security/csp";

function supabaseImageRemotePattern():
  | { protocol: "https"; hostname: string; pathname: string }
  | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return undefined;
  try {
    const { hostname } = new URL(raw);
    if (!hostname) return undefined;
    return {
      protocol: "https",
      hostname,
      pathname: "/storage/v1/object/public/**",
    };
  } catch {
    return undefined;
  }
}

const supabasePattern = supabaseImageRemotePattern();

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: ["127.0.0.1", "192.168.178.109", "localhost"],
  devIndicators: false,
  images: {
    remotePatterns: [
      ...(supabasePattern ? [supabasePattern] : []),
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    viewTransition: true,
    // Manual-entry photos + multi-page PDFs exceed the 1MB default.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [
      // Exclude the document proxy — global DENY / frame-ancestors 'none'
      // would merge with SAMEORIGIN and blank PDF iframes in Chrome.
      {
        source: "/((?!api/documents/file$).*)",
        headers: securityHeaderEntries(),
      },
      {
        source: "/api/documents/file",
        headers: documentFileSecurityHeaderEntries(),
      },
    ];
  },
};

export default nextConfig;
