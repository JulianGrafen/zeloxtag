import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo/site-url";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/demo",
        "/impressum",
        "/datenschutz",
        "/agb",
        "/login",
        "/register",
      ],
      disallow: [
        "/v/",
        "/dashboard",
        "/settings",
        "/qr",
        "/auth/",
        "/api/",
        "/expose/",
        "/einladung/",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
