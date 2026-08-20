import type { NextConfig } from "next";

import {
  documentFileSecurityHeaderEntries,
  securityHeaderEntries,
  vehicleImageSecurityHeaderEntries,
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
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "heic-convert", "heic-decode", "libheif-js"],
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
    // Manual-entry photos + multi-page PDFs exceed the 1MB default.
    serverActions: {
      bodySizeLimit: "12mb",
    },
    // Silhouette uploads pass through Next.js Proxy — avoid truncated multipart bodies.
    proxyClientMaxBodySize: "12mb",
  },
  async headers() {
    return [
      // Exclude static assets + media proxies — COEP/CORP on JS chunks breaks hydration.
      {
        source:
          "/((?!_next/static/|_next/image/|favicon.ico|api/documents/file$|api/vehicle/silhouette/|api/vehicle/catalog/).*)",
        headers: securityHeaderEntries(),
      },
      {
        source: "/api/documents/file",
        headers: documentFileSecurityHeaderEntries(),
      },
      {
        source: "/api/vehicle/silhouette/:path*",
        headers: vehicleImageSecurityHeaderEntries(),
      },
      {
        source: "/api/vehicle/catalog/:path*",
        headers: vehicleImageSecurityHeaderEntries(),
      },
    ];
  },
};

export default nextConfig;
