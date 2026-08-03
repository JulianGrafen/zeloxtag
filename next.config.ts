import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: ["127.0.0.1", "192.168.178.109", "localhost"],
  devIndicators: false,
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
