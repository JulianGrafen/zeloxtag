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
  turbopack: {
    root: process.cwd(),
  },
  transpilePackages: ["@imgly/background-removal", "onnxruntime-web"],
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
    // Silhouette uploads pass through Next.js Proxy — avoid truncated multipart bodies.
    proxyClientMaxBodySize: "12mb",
  },
  async headers() {
    return [
      // Exclude document + vehicle PNG proxies — global COEP/CORP/DENY would
      // conflict with embeddable same-origin image responses under COEP pages.
      {
        source:
          "/((?!api/documents/file$|api/vehicle/silhouette/|api/vehicle/catalog/).*)",
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
