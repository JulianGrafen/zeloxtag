import type { NextConfig } from "next";

import {
  documentFileSecurityHeaderEntries,
  securityHeaderEntries,
} from "./src/lib/security/csp";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: ["127.0.0.1", "192.168.178.109", "localhost"],
  devIndicators: false,
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
